from typing import List, Optional, Literal
from pydantic import BaseModel, Field

MemoryCategoryType = Literal["profile", "preference", "fact", "goal", "context"]


class MemoryCreate(BaseModel):
    content: str = Field(..., description="Memory text content string")
    category: Optional[str] = Field(default="preference", description="Memory category: profile, preference, fact, goal, context")
    importance: Optional[int] = Field(default=3, ge=1, le=5, description="Importance level from 1 to 5")


class MemoryResponse(BaseModel):
    id: int
    category: str
    content: str
    importance: int
    created_at: str
    updated_at: str


class MemoryListResponse(BaseModel):
    memories: List[MemoryResponse]
    count: int
