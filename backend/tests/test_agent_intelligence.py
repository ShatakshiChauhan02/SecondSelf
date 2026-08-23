import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.agent.agent import AgentCore
from app.tools.registry import ToolRegistry, Tool
from app.llm.base import BaseLLMProvider

client = TestClient(app)


def test_tool_risk_classification_metadata():
    """Verify tool risk metadata is correctly assigned for all tools."""
    registry = ToolRegistry()
    declarations = registry.get_declarations()
    decl_map = {d["name"]: d.get("risk_level") for d in declarations}

    # READ tools
    assert decl_map["browser_search"] == "READ"
    assert decl_map["browser_read"] == "READ"
    assert decl_map["browser_screenshot"] == "READ"
    assert decl_map["browser_current_url"] == "READ"
    assert decl_map["computer_screenshot"] == "READ"

    # SAFE_ACTION tools
    assert decl_map["browser_open"] == "SAFE_ACTION"
    assert decl_map["computer_open_app"] == "SAFE_ACTION"
    assert decl_map["computer_type"] == "SAFE_ACTION"
    assert decl_map["computer_click"] == "SAFE_ACTION"
    assert decl_map["computer_move_mouse"] == "SAFE_ACTION"
    assert decl_map["computer_press_key"] == "SAFE_ACTION"
    assert decl_map["computer_hotkey"] == "SAFE_ACTION"


def test_task_status_computation():
    """Verify status computation for completed, partial, and failed tool executions."""
    agent = AgentCore()

    # 1. All tools succeed -> completed
    tools_all_success = [
        {"name": "browser_search", "success": True},
        {"name": "computer_open_app", "success": True}
    ]
    assert agent._compute_task_status(tools_all_success, max_limit_reached=False) == "completed"

    # 2. Mixed success & failure -> partial
    tools_mixed = [
        {"name": "browser_search", "success": True},
        {"name": "computer_open_app", "success": False}
    ]
    assert agent._compute_task_status(tools_mixed, max_limit_reached=False) == "partial"

    # 3. All tools fail -> failed
    tools_all_fail = [
        {"name": "computer_open_app", "success": False}
    ]
    assert agent._compute_task_status(tools_all_fail, max_limit_reached=False) == "failed"

    # 4. Max limit reached with at least one success -> partial
    assert agent._compute_task_status(tools_all_success, max_limit_reached=True) == "partial"


@pytest.mark.asyncio
@patch("app.agent.agent.get_llm_provider")
async def test_multi_tool_workflow_orchestration(mock_get_provider):
    """Verify AgentCore multi-tool workflow (search -> open app -> type text -> summary)."""
    mock_provider = AsyncMock(spec=BaseLLMProvider)
    mock_provider.provider_name = "gemini"

    # LLM responses: 1. browser_search, 2. computer_open_app, 3. computer_type, 4. Final Text
    mock_provider.generate_response_with_tools.side_effect = [
        {"type": "tool_call", "name": "browser_search", "args": {"query": "AI frameworks"}},
        {"type": "tool_call", "name": "computer_open_app", "args": {"app": "notepad"}},
        {"type": "tool_call", "name": "computer_type", "args": {"text": "AI agent summary"}},
        {"type": "final_response", "text": "Done — I searched Google and wrote the summary into Notepad."}
    ]
    mock_get_provider.return_value = mock_provider

    # Registry with mock functions
    registry = ToolRegistry()
    mock_search = AsyncMock(return_value="Python AI frameworks text")
    mock_open_app = AsyncMock(return_value={"app": "notepad", "status": "launched"})
    mock_type = AsyncMock(return_value={"status": "typed"})

    registry.register(Tool("browser_search", "search", {}, mock_search, "READ"))
    registry.register(Tool("computer_open_app", "open", {}, mock_open_app, "SAFE_ACTION"))
    registry.register(Tool("computer_type", "type", {}, mock_type, "SAFE_ACTION"))

    agent = AgentCore(provider=mock_provider, tool_registry=registry)
    res = await agent.process_task("Search Google and save in Notepad")

    assert res["status"] == "completed"
    assert len(res["tool_calls"]) == 3
    assert res["response"] == "Done — I searched Google and wrote the summary into Notepad."


@pytest.mark.asyncio
@patch("app.agent.agent.get_llm_provider")
async def test_tool_failure_recovery_handling(mock_get_provider):
    """Verify tool failure returns error context to LLM and computes status correctly."""
    mock_provider = AsyncMock(spec=BaseLLMProvider)
    mock_provider.provider_name = "gemini"

    # LLM calls browser_open, receives error, then outputs clean failure explanation
    mock_provider.generate_response_with_tools.side_effect = [
        {"type": "tool_call", "name": "computer_open_app", "args": {"app": "notepad"}},
        {"type": "final_response", "text": "I couldn't open Notepad because Computer Control is disabled."}
    ]
    mock_get_provider.return_value = mock_provider

    registry = ToolRegistry()
    # Mock computer_open_app raising PermissionError (disabled state)
    def failing_open_app(app):
        raise PermissionError("Computer control is disabled. User approval is required.")

    registry.register(Tool("computer_open_app", "open", {}, failing_open_app, "SAFE_ACTION"))

    agent = AgentCore(provider=mock_provider, tool_registry=registry)
    res = await agent.process_task("Open Notepad")

    assert res["status"] == "failed"
    assert len(res["tool_calls"]) == 1
    assert res["tool_calls"][0]["success"] is False
    assert "computer control is disabled" in res["response"].lower()



def test_chat_response_status_field():
    """Verify POST /api/agent/chat includes status field in response."""
    with patch("app.agent.agent.get_llm_provider") as mock_get_provider:
        mock_provider = AsyncMock(spec=BaseLLMProvider)
        mock_provider.provider_name = "gemini"
        mock_provider.generate_response_with_tools.return_value = {
            "type": "final_response",
            "text": "Hello! I am SecondSelf."
        }
        mock_get_provider.return_value = mock_provider

        response = client.post("/api/agent/chat", json={"message": "Hello twin"})
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "completed"
