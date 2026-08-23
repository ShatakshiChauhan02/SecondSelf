import json
from typing import List, Dict, Any, Optional
from app.llm.base import BaseLLMProvider
from app.llm.factory import get_llm_provider
from app.agent.prompts import SYSTEM_PROMPT
from app.memory.service import MemoryService
from app.tools.registry import ToolRegistry, default_registry


class AgentCore:
    """
    SecondSelf AI Agent Core engine.
    Orchestrates memory context, LLM reasoning, internal step planning, multi-tool workflow execution,
    and task status reporting (completed | partial | failed).
    """

    def __init__(
        self,
        provider: Optional[BaseLLMProvider] = None,
        memory_service: Optional[MemoryService] = None,
        tool_registry: Optional[ToolRegistry] = None
    ):
        self._provider = provider
        self._memory_service = memory_service or MemoryService()
        self._tool_registry = tool_registry or default_registry

    def get_provider(self) -> BaseLLMProvider:
        """Fetch active provider or initialize default provider."""
        if not self._provider:
            self._provider = get_llm_provider()
        return self._provider

    def _create_internal_plan(self, message: str) -> Dict[str, Any]:
        """Create a lightweight internal plan representation."""
        return {
            "goal": message,
            "steps": []
        }

    def _compute_task_status(self, executed_tools: List[Dict[str, Any]], max_limit_reached: bool) -> str:
        """
        Compute overall task status: 'completed' | 'partial' | 'failed'
        """
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

    async def process_task(self, message: str, history: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Process a user task message with memory integration, lightweight step planning,
        and multi-tool execution loop (max 5 iterations).
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

        # 4. Build conversation sequence
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
        internal_plan = self._create_internal_plan(clean_message)

        # 5. Controlled Multi-Tool Execution Loop (Max 5 Iterations)
        MAX_ITERATIONS = 5
        iteration = 0
        max_limit_reached = False

        while iteration < MAX_ITERATIONS:
            iteration += 1

            llm_step = await provider.generate_response_with_tools(
                messages=messages,
                system_prompt=combined_system_prompt,
                tools=tool_declarations
            )

            if llm_step.get("type") == "tool_call":
                tool_name = llm_step.get("name")
                tool_args = llm_step.get("args") or {}

                # Internal plan step tracking
                step_desc = f"Executing {tool_name}"
                internal_plan["steps"].append({"description": step_desc, "status": "in_progress"})

                # Execute tool via ToolRegistry
                tool_res = await self._tool_registry.execute(tool_name, tool_args)
                is_success = tool_res.get("success", False)

                # Record tool call metadata
                call_record = {
                    "iteration": iteration,
                    "name": tool_name,
                    "arguments": tool_args,
                    "success": is_success,
                    "risk_level": tool_res.get("risk_level", "SAFE_ACTION"),
                    "result_preview": str(tool_res.get("result", tool_res.get("error", "")))[:200]
                }
                executed_tool_calls.append(call_record)

                # Update internal plan step status
                internal_plan["steps"][-1]["status"] = "completed" if is_success else "failed"

                # Feed observation back to conversation history for LLM failure recovery or next tool step
                obs_text = json.dumps(tool_res)
                messages.append({"sender": "twin", "text": f"[Tool Call: {tool_name}({json.dumps(tool_args)})]"})
                messages.append({"sender": "user", "text": f"[Tool Observation Result]: {obs_text}"})

            else:
                # LLM returned final text response
                final_text = llm_step.get("text", "")
                task_status = self._compute_task_status(executed_tool_calls, max_limit_reached=False)

                return {
                    "response": final_text,
                    "provider": provider.provider_name,
                    "status": task_status,
                    "tool_calls": executed_tool_calls
                }

        # Iteration limit reached safety exit
        max_limit_reached = True
        task_status = self._compute_task_status(executed_tool_calls, max_limit_reached=True)

        return {
            "response": f"Task execution reached the maximum safety limit of {MAX_ITERATIONS} tool iterations.",
            "provider": provider.provider_name,
            "status": task_status,
            "tool_calls": executed_tool_calls
        }
