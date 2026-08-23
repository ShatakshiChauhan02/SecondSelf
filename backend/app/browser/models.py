from pydantic import BaseModel, Field


class BrowserStatus(BaseModel):
    running: bool = Field(..., description="Whether the Playwright browser is active")
    current_url: str = Field(..., description="Current active URL")
    last_action: str = Field(..., description="Last browser tool action performed")


class NavigationResult(BaseModel):
    title: str = Field(..., description="Webpage title string")
    url: str = Field(..., description="Final navigated URL string")
    preview: str = Field(..., description="Text content preview from webpage")
