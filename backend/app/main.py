"""
SecondSelf FastAPI Backend Application Entrypoint.
Phase 7 True Computer-Use Agent implementation.
"""

from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status, Path as FastAPIPath
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.agent.agent import AgentCore
from app.agent.task_repository import TaskRepository
from app.llm.base import LLMConfigurationError, LLMProviderError
from app.memory.service import MemoryService
from app.memory.models import MemoryCreate, MemoryResponse, MemoryListResponse
from app.browser.service import BrowserService
from app.browser.models import BrowserStatus
from app.computer.service import ComputerService
from app.computer.models import ComputerStatus


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Cleanly manage background resources and close browser on shutdown."""
    yield
    # Shutdown browser session on application exit
    browser_service = BrowserService()
    await browser_service.stop()


app = FastAPI(
    title="SecondSelf API",
    description="Backend service for SecondSelf Windows AI Digital Twin Prototype",
    version="0.7.0",
    lifespan=lifespan
)

# Configure CORS for local frontend access
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health Check Models & Routes
class HealthResponse(BaseModel):
    status: str
    project: str


@app.get("/api/health", response_model=HealthResponse)
async def get_health():
    """Health check endpoint maintained from Phase 0."""
    return HealthResponse(
        status="ok",
        project="SecondSelf"
    )


# Agent Chat Models & Routes
class ChatRequest(BaseModel):
    message: str = Field(..., description="User prompt message string")
    history: Optional[List[Dict[str, Any]]] = Field(default=None, description="Optional conversation context history")


class ChatResponse(BaseModel):
    response: str
    provider: str
    status: str = Field("completed", description="Task execution status: completed | partial | failed | cancelled")
    tool_calls: Optional[List[Dict[str, Any]]] = Field(default=[], description="List of tool execution records")


class ErrorDetail(BaseModel):
    detail: str


task_repo = TaskRepository()


@app.post(
    "/api/agent/chat",
    response_model=ChatResponse,
    responses={
        400: {"model": ErrorDetail, "description": "Invalid Request or Missing Configuration"},
        500: {"model": ErrorDetail, "description": "LLM Provider Execution Error"},
    }
)
async def agent_chat(request: ChatRequest):
    """
    Agent chat endpoint processing user tasks through Agent Core Observe -> Think -> Act -> Verify loop.
    """
    clean_message = request.message.strip() if request.message else ""
    if not clean_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message prompt cannot be empty or whitespace."
        )

    agent = AgentCore()

    try:
        result = await agent.process_task(
            message=clean_message,
            history=request.history
        )
        return ChatResponse(
            response=result["response"],
            provider=result["provider"],
            status=result.get("status", "completed"),
            tool_calls=result.get("tool_calls", [])
        )

    except LLMConfigurationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except LLMProviderError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )


# Task Management REST Endpoints
@app.post("/api/tasks/{task_id}/cancel")
async def cancel_task(task_id: str = FastAPIPath(..., description="ID of task to cancel")):
    """Cancel an executing agent task."""
    success = AgentCore.cancel_task(task_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active task with ID '{task_id}' not found or already completed."
        )
    return {"status": "cancelled", "task_id": task_id}


@app.get("/api/tasks/{task_id}")
async def get_task_details(task_id: str = FastAPIPath(..., description="ID of task to fetch")):
    """Retrieve details for a specific task."""
    active_task = AgentCore.get_task(task_id)
    if active_task:
        return active_task.model_dump()

    stored_task = task_repo.get_task(task_id)
    if stored_task:
        return stored_task

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Task with ID '{task_id}' not found."
    )


@app.get("/api/tasks")
async def list_tasks(limit: int = 20):
    """Retrieve historical tasks list."""
    return {"tasks": task_repo.list_tasks(limit=limit)}


# Memory Management REST Endpoints
memory_service = MemoryService()


@app.get("/api/memory", response_model=MemoryListResponse)
async def list_memories(category: Optional[str] = None):
    """Retrieve stored memories from SQLite."""
    memories = memory_service.list_memories(category=category)
    return MemoryListResponse(
        memories=memories,
        count=len(memories)
    )


@app.post("/api/memory", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
async def create_memory(memory_in: MemoryCreate):
    """Manually store a new memory item."""
    clean_content = memory_in.content.strip()
    if not clean_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Memory content cannot be empty."
        )

    created_mem = memory_service.add_memory(
        content=clean_content,
        category=memory_in.category or "preference",
        importance=memory_in.importance or 3
    )
    return MemoryResponse(**created_mem)


@app.delete("/api/memory/{memory_id}")
async def delete_memory(memory_id: int = FastAPIPath(..., description="ID of memory item to delete")):
    """Delete a specific memory item by ID."""
    success = memory_service.delete_memory(memory_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Memory with ID {memory_id} not found."
        )
    return {"status": "deleted", "id": memory_id}


# Browser Management REST Endpoints
browser_service = BrowserService()


@app.get("/api/browser/status", response_model=BrowserStatus)
async def get_browser_status():
    """Retrieve real-time browser status (running, current_url, last_action)."""
    status_dict = browser_service.get_status()
    return BrowserStatus(**status_dict)


# Computer Control REST Endpoints
computer_service = ComputerService()


@app.get("/api/computer/status", response_model=ComputerStatus)
async def get_computer_status():
    """Retrieve real-time computer control status."""
    return ComputerStatus(**computer_service.get_status())


@app.post("/api/computer/enable", response_model=ComputerStatus)
async def enable_computer_control():
    """Enable Windows computer control upon explicit user approval."""
    computer_service.enable()
    return ComputerStatus(**computer_service.get_status())


@app.post("/api/computer/disable", response_model=ComputerStatus)
async def disable_computer_control():
    """Disable Windows computer control immediately."""
    computer_service.disable()
    return ComputerStatus(**computer_service.get_status())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
