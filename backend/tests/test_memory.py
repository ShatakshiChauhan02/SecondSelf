import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.memory.service import MemoryService
from app.memory.repository import MemoryRepository
from app.agent.agent import AgentCore
from app.llm.base import BaseLLMProvider

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_memory_db():
    """Ensure clean test database state before and after each test."""
    repo = MemoryRepository()
    all_mems = repo.list_all()
    for m in all_mems:
        repo.delete_by_id(m["id"])
    yield
    all_mems = repo.list_all()
    for m in all_mems:
        repo.delete_by_id(m["id"])


def test_memory_crud_operations():
    """Test basic Add, Get, List, Search, and Delete memory operations."""
    service = MemoryService()

    # 1. Add
    mem = service.add_memory("User prefers concise explanations.", category="preference", importance=4)
    assert mem["id"] is not None
    assert mem["category"] == "preference"
    assert mem["content"] == "User prefers concise explanations."

    # 2. Get & List
    listed = service.list_memories()
    assert len(listed) == 1
    assert listed[0]["id"] == mem["id"]

    # 3. Search
    found = service._repo.search("concise")
    assert len(found) == 1
    assert found[0]["id"] == mem["id"]

    # 4. Delete
    deleted = service.delete_memory(mem["id"])
    assert deleted is True
    assert len(service.list_memories()) == 0


def test_memory_persistence():
    """Test that stored memories persist across service re-instantiation (simulating backend restart)."""
    service1 = MemoryService()
    mem = service1.add_memory("My name is Shivam.", category="profile", importance=5)

    # Re-instantiate service (simulating server restart)
    service2 = MemoryService()
    listed = service2.list_memories()
    assert len(listed) == 1
    assert listed[0]["content"] == "My name is Shivam."


def test_explicit_remember_command():
    """Test parsing of 'Remember that I prefer dark theme' command."""
    service = MemoryService()
    handled, reply = service.check_and_handle_explicit_commands("Remember that I prefer dark theme")
    assert handled is True
    assert "I'll remember that" in reply
    assert "prefer dark theme" in reply

    stored = service.list_memories()
    assert len(stored) == 1
    assert "prefer dark theme" in stored[0]["content"]


def test_explicit_forget_command():
    """Test parsing of 'Forget that I prefer dark theme' command."""
    service = MemoryService()
    service.add_memory("I prefer dark theme", category="preference")

    handled, reply = service.check_and_handle_explicit_commands("Forget that I prefer dark theme")
    assert handled is True
    assert "removed that from my memory" in reply
    assert len(service.list_memories()) == 0


@pytest.mark.asyncio
@patch("app.agent.agent.get_llm_provider")
async def test_agent_with_memory_context(mock_get_provider):
    """Test that AgentCore injects stored user memories into the LLM system prompt context."""
    mock_provider = AsyncMock(spec=BaseLLMProvider)
    mock_provider.provider_name = "gemini"
    mock_provider.generate_response_with_tools.return_value = {
        "type": "final_response",
        "text": "Concise answer provided."
    }
    mock_get_provider.return_value = mock_provider

    service = MemoryService()
    service.add_memory("User prefers concise explanations.", category="preference", importance=5)

    agent = AgentCore(provider=mock_provider, memory_service=service)
    res = await agent.process_task("Explain quantum computing")

    assert res["response"] == "Concise answer provided."

    # Verify generate_response_with_tools system_prompt argument contained memory context
    call_args = mock_provider.generate_response_with_tools.call_args
    assert call_args is not None
    system_prompt_arg = call_args.kwargs.get("system_prompt") or call_args[1].get("system_prompt")
    assert "User prefers concise explanations" in system_prompt_arg


def test_memory_api_endpoints():
    """Test REST API endpoints GET /api/memory, POST /api/memory, DELETE /api/memory/{id}."""
    # 1. POST /api/memory
    post_res = client.post("/api/memory", json={"content": "Loves Python programming", "category": "fact", "importance": 4})
    assert post_res.status_code == 201
    mem_data = post_res.json()
    mem_id = mem_data["id"]

    # 2. GET /api/memory
    get_res = client.get("/api/memory")
    assert get_res.status_code == 200
    list_data = get_res.json()
    assert list_data["count"] == 1
    assert list_data["memories"][0]["content"] == "Loves Python programming"

    # 3. DELETE /api/memory/{id}
    del_res = client.delete(f"/api/memory/{mem_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # 4. Verify 0 count
    get_res2 = client.get("/api/memory")
    assert get_res2.json()["count"] == 0
