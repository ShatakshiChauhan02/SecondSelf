import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.llm.base import BaseLLMProvider, LLMConfigurationError, LLMProviderError

client = TestClient(app)


def test_health_check():
    """Verify GET /api/health returns HTTP 200 and correct JSON structure."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "project": "SecondSelf"}


def test_agent_chat_empty_message():
    """Verify POST /api/agent/chat rejects empty or whitespace-only messages."""
    response = client.post("/api/agent/chat", json={"message": "   "})
    assert response.status_code == 400
    assert "cannot be empty" in response.json()["detail"]


@patch("app.agent.agent.get_llm_provider")
def test_agent_chat_missing_configuration(mock_get_provider):
    """Verify POST /api/agent/chat handles missing API key configuration cleanly."""
    mock_provider = AsyncMock(spec=BaseLLMProvider)
    mock_provider.generate_response_with_tools.side_effect = LLMConfigurationError(
        "Gemini API key is not configured."
    )
    mock_get_provider.return_value = mock_provider

    response = client.post("/api/agent/chat", json={"message": "Hello twin"})
    assert response.status_code == 400
    assert "Gemini API key is not configured" in response.json()["detail"]


@patch("app.agent.agent.get_llm_provider")
def test_agent_chat_success_mocked(mock_get_provider):
    """Verify POST /api/agent/chat returns valid ChatResponse when provider is mocked."""
    mock_provider = AsyncMock(spec=BaseLLMProvider)
    mock_provider.provider_name = "gemini"
    mock_provider.generate_response_with_tools.return_value = {
        "type": "final_response",
        "text": "Hello! I am SecondSelf, your AI digital twin."
    }
    mock_get_provider.return_value = mock_provider

    response = client.post(
        "/api/agent/chat",
        json={"message": "Hello SecondSelf", "history": []}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "Hello! I am SecondSelf, your AI digital twin."
    assert data["provider"] == "gemini"
