import json
import asyncio
from typing import List, Dict, Any, Optional
from app.llm.base import BaseLLMProvider
from app.llm.factory import get_llm_provider
from app.agent.prompts import SYSTEM_PROMPT
from app.memory.service import MemoryService
from app.tools.registry import ToolRegistry, default_registry
from app.agent.task_model import Task, TaskStatus, TaskStep, Observation
from app.agent.actions import map_action_to_tool
from app.agent.task_repository import TaskRepository


class AgentCore:
    """
    SecondSelf Computer-Use AI Agent Core engine.
    Orchestrates memory context, structured task planning, Observe -> Think -> Act -> Verify loop,
    action retry/verification, task cancellation, and status reporting.
    """

    _active_tasks: Dict[str, Task] = {}

    def __init__(
        self,
        provider: Optional[BaseLLMProvider] = None,
        memory_service: Optional[MemoryService] = None,
        tool_registry: Optional[ToolRegistry] = None,
        task_repository: Optional[TaskRepository] = None
    ):
        self._provider = provider
        self._memory_service = memory_service or MemoryService()
        self._tool_registry = tool_registry or default_registry
        self._task_repo = task_repository or TaskRepository()

    def get_provider(self) -> BaseLLMProvider:
        """Fetch active provider or initialize default provider."""
        if not self._provider:
            self._provider = get_llm_provider()
        return self._provider

    @classmethod
    def cancel_task(cls, task_id: str) -> bool:
        """Cancel an actively executing or pending task."""
        if task_id in cls._active_tasks:
            cls._active_tasks[task_id].status = TaskStatus.CANCELLED
            return True
        return False

    @classmethod
    def get_task(cls, task_id: str) -> Optional[Task]:
        """Fetch active task model by ID."""
        return cls._active_tasks.get(task_id)

    def _compute_task_status(self, executed_tools: List[Dict[str, Any]], max_limit_reached: bool) -> str:
        """Compute overall task status string: 'completed' | 'partial' | 'failed' | 'cancelled'."""
        if not executed_tools:
            return "completed"

        successes = sum(1 for t in executed_tools if t.get("success", False))
        failures = len(executed_tools) - successes

        if max_limit_reached:
            return "partial" if successes > 0 else "failed"

        if failures == 0:
            return "completed"
        elif successes > 0:
            return "partial"
        else:
            return "failed"

    async def _observe_state(self, current_tool: Optional[str] = None) -> Observation:
        """Capture current computer/browser observation state."""
        obs = Observation(status_notes=f"Observed state before/after {current_tool or 'action'}")
        
        # Check active browser URL if browser tool was used
        if current_tool and "browser" in current_tool:
            try:
                url_res = await self._tool_registry.execute("browser_current_url", {})
                if url_res.get("success"):
                    obs.active_url = url_res.get("result")
            except Exception:
                pass

        return obs

    async def process_task(
        self,
        message: str,
        history: Optional[List[Dict[str, Any]]] = None,
        max_iterations: int = 15
    ) -> Dict[str, Any]:
        """
        Process a user task using the Observe -> Think -> Act -> Verify Loop.
        """
        clean_message = message.strip()

        # 1. Check for explicit memory commands ("Remember that...", "Forget that...")
        is_handled, memory_reply = self._memory_service.check_and_handle_explicit_commands(clean_message)
        if is_handled and memory_reply:
            return {
                "response": memory_reply,
                "provider": "system_memory",
                "status": "completed",
                "tool_calls": []
            }

        # 2. Auto-extract personal profile/fact statements
        self._memory_service.auto_extract_personal_facts(clean_message)

        # 3. Retrieve relevant memory context for LLM prompt
        memory_context = self._memory_service.get_memory_context_for_prompt(clean_message)
        combined_system_prompt = f"{SYSTEM_PROMPT}\n{memory_context}" if memory_context else SYSTEM_PROMPT

        # 4. Initialize structured Task model
        task = Task(user_goal=clean_message)
        task.status = TaskStatus.PLANNING
        AgentCore._active_tasks[task.task_id] = task

        # 5. Build conversation sequence
        messages = []
        if history:
            for item in history:
                sender = item.get("sender", "user")
                text = item.get("text", "")
                if text:
                    messages.append({"sender": sender, "text": text})

        messages.append({"sender": "user", "text": clean_message})

        provider = self.get_provider()
        tool_declarations = self._tool_registry.get_declarations()
        executed_tool_calls = []

        # 6. Controlled Observe -> Think -> Act -> Verify Loop
        MAX_ITERATIONS = max_iterations
        MAX_STEP_RETRIES = 3
        iteration = 0
        max_limit_reached = False

        task.status = TaskStatus.ACTING

        while iteration < MAX_ITERATIONS:
            # Cancellation Check
            if task.status == TaskStatus.CANCELLED:
                self._task_repo.save_task(task)
                return {
                    "response": "Task was cancelled by user.",
                    "provider": provider.provider_name,
                    "status": "cancelled",
                    "tool_calls": executed_tool_calls
                }

            iteration += 1
            task.updated_at = datetime.now(timezone.utc).isoformat() if 'datetime' in globals() else ""

            # THINK: Prompt LLM with context & tools
            llm_step = await provider.generate_response_with_tools(
                messages=messages,
                system_prompt=combined_system_prompt,
                tools=tool_declarations
            )

            if llm_step.get("type") == "tool_call":
                action_name = llm_step.get("name", "")
                raw_args = llm_step.get("args") or {}

                # Map action name & arguments via controlled vocabulary
                tool_name, tool_args = map_action_to_tool(action_name, raw_args)

                # Record plan step
                step = TaskStep(
                    step_id=len(task.plan) + 1,
                    description=f"Action {tool_name}",
                    tool_name=tool_name,
                    arguments=tool_args,
                    status="in_progress",
                    expected_result=f"Execute {tool_name} successfully"
                )
                task.plan.append(step)

                # ACT: Execute tool via ToolRegistry
                task.status = TaskStatus.ACTING
                tool_res = await self._tool_registry.execute(tool_name, tool_args)
                is_success = tool_res.get("success", False)

                # VERIFY: Observe resulting state and verify action result
                task.status = TaskStatus.VERIFYING
                obs = await self._observe_state(tool_name)
                task.observations.append(obs)

                if is_success:
                    step.status = "verified"
                    step.actual_result = str(tool_res.get("result", ""))[:300]
                else:
                    step.status = "failed"
                    step.actual_result = str(tool_res.get("error", "Action failed"))[:300]

                # Record tool call execution metadata
                call_record = {
                    "iteration": iteration,
                    "name": tool_name,
                    "arguments": tool_args,
                    "success": is_success,
                    "risk_level": tool_res.get("risk_level", "SAFE_ACTION"),
                    "result_preview": str(tool_res.get("result", tool_res.get("error", "")))[:200]
                }
                executed_tool_calls.append(call_record)
                task.executed_actions.append(call_record)

                # Retry / Failure recovery handling
                if not is_success and step.retries < MAX_STEP_RETRIES:
                    step.retries += 1
                    messages.append({"sender": "twin", "text": f"[Action {tool_name} failed: {tool_res.get('error')}]"})
                    messages.append({"sender": "user", "text": f"[System Retry Notice]: Action {tool_name} failed. Please attempt a recovery step or alternative tool."})
                else:
                    obs_text = json.dumps(tool_res)
                    messages.append({"sender": "twin", "text": f"[Tool Call: {tool_name}({json.dumps(tool_args)})]"})
                    messages.append({"sender": "user", "text": f"[Tool Observation Result]: {obs_text}"})

            else:
                # LLM returned final text response
                final_text = llm_step.get("text", "")
                task.status = TaskStatus.COMPLETED
                task.result_summary = final_text[:500]
                self._task_repo.save_task(task)

                task_status = self._compute_task_status(executed_tool_calls, max_limit_reached=False)

                return {
                    "response": final_text,
                    "provider": provider.provider_name,
                    "status": task_status,
                    "tool_calls": executed_tool_calls
                }

        # Iteration limit reached safety exit
        max_limit_reached = True
        task.status = TaskStatus.FAILED
        task.result_summary = f"Task reached safety limit of {MAX_ITERATIONS} iterations."
        self._task_repo.save_task(task)

        task_status = self._compute_task_status(executed_tool_calls, max_limit_reached=True)

        return {
            "response": f"Task execution reached the maximum safety limit of {MAX_ITERATIONS} tool iterations.",
            "provider": provider.provider_name,
            "status": task_status,
            "tool_calls": executed_tool_calls
        }
