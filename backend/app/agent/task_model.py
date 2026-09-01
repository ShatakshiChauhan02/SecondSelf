from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid


class TaskStatus(str, Enum):
    IDLE = "IDLE"
    PLANNING = "PLANNING"
    OBSERVING = "OBSERVING"
    ACTING = "ACTING"
    VERIFYING = "VERIFYING"
    WAITING_FOR_APPROVAL = "WAITING_FOR_APPROVAL"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class TaskStep(BaseModel):
    step_id: int
    description: str
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    status: str = Field(default="pending", description="pending | in_progress | completed | failed | verified")
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    retries: int = 0


class Observation(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    active_url: Optional[str] = None
    screenshot_file: Optional[str] = None
    extracted_text: Optional[str] = None
    status_notes: Optional[str] = None


class Task(BaseModel):
    task_id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:8]}")
    user_goal: str
    status: TaskStatus = TaskStatus.IDLE
    plan: List[TaskStep] = Field(default_factory=list)
    current_step_index: int = 0
    observations: List[Observation] = Field(default_factory=list)
    executed_actions: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    result_summary: Optional[str] = None
