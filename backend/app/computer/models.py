from pydantic import BaseModel, Field


class ComputerStatus(BaseModel):
    enabled: bool = Field(..., description="Whether computer control user approval is enabled")
    screen_width: int = Field(..., description="Screen width resolution in pixels")
    screen_height: int = Field(..., description="Screen height resolution in pixels")
    last_action: str = Field(..., description="Last computer action executed")
