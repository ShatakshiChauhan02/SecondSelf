import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.browser.service import BrowserService
from app.tools.registry import ToolRegistry, Tool
from app.agent.agent import AgentCore
from app.llm.base import BaseLLMProvider

client = TestClient(app)


def test_url_validation_safety():
    """Verify BrowserService URL validation accepts HTTP/HTTPS and rejects dangerous schemes."""
    # Valid URLs
    assert BrowserService.validate_url("https://example.com") == "https://example.com"
    assert BrowserService.validate_url("http://google.com") == "http://google.com"
    assert BrowserService.validate_url("google.com") == "https://google.com"

    # Dangerous / Forbidden Schemes
    with pytest.raises(ValueError, match="Dangerous or restricted URL scheme"):
        BrowserService.validate_url("file:///C:/Windows/System32")

    with pytest.raises(ValueError, match="Dangerous or restricted URL scheme"):
        BrowserService.validate_url("javascript:alert(1)")

    with pytest.raises(ValueError, match="Dangerous or restricted URL scheme"):
        BrowserService.validate_url("data:text/html,<h1>Hack</h1>")


def test_tool_registry_discovery():
    """Verify ToolRegistry registers the 5 required browser tools."""
    registry = ToolRegistry()
    declarations = registry.get_declarations()
    names = [d["name"] for d in declarations]

    assert "browser_open" in names
    assert "browser_search" in names
    assert "browser_read" in names
    assert "browser_screenshot" in names
    assert "browser_current_url" in names


@pytest.mark.asyncio
async def test_tool_registry_execution_mocked():
    """Verify ToolRegistry dispatches execution to underlying functions correctly."""
    registry = ToolRegistry()
    mock_func = AsyncMock(return_value="https://www.google.com")
    registry.register(Tool(
        name="test_url_tool",
        description="Test tool",
        parameters={},
        func=mock_func
    ))

    result = await registry.execute("test_url_tool", {})
    assert result["success"] is True
    assert result["result"] == "https://www.google.com"
    mock_func.assert_called_once()


@pytest.mark.asyncio
@patch("app.agent.agent.get_llm_provider")
async def test_agent_max_iterations_limit(mock_get_provider):
    """Verify AgentCore stops execution and returns safety message when tool loop reaches 5 iterations."""
    mock_provider = AsyncMock(spec=BaseLLMProvider)
    mock_provider.provider_name = "gemini"
    # Always request another tool call
    mock_provider.generate_response_with_tools.return_value = {
        "type": "tool_call",
        "name": "browser_current_url",
        "args": {}
    }
    mock_get_provider.return_value = mock_provider

    mock_registry = ToolRegistry()
    mock_tool_func = AsyncMock(return_value="https://example.com")
    mock_registry.register(Tool(
        name="browser_current_url",
        description="Get current URL",
        parameters={},
        func=mock_tool_func
    ))

    agent = AgentCore(provider=mock_provider, tool_registry=mock_registry)
    res = await agent.process_task("Loop forever tool call")

    assert "maximum safety limit of 5 tool iterations" in res["response"]
    assert len(res["tool_calls"]) == 5


def test_browser_status_endpoint():
    """Verify GET /api/browser/status returns status structure."""
    response = client.get("/api/browser/status")
    assert response.status_code == 200
    data = response.json()
    assert "running" in data
    assert "current_url" in data
    assert "last_action" in data
