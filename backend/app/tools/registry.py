from typing import Dict, Any, List, Callable, Optional
from app.browser.service import BrowserService
from app.computer.service import ComputerService


class Tool:
    """Class representing a tool definition with metadata, risk classification, and execution function."""
    def __init__(
        self,
        name: str,
        description: str,
        parameters: dict,
        func: Callable,
        risk_level: str = "READ"
    ):
        self.name = name
        self.description = description
        self.parameters = parameters
        self.func = func
        self.risk_level = risk_level  # "READ" | "SAFE_ACTION" | "CONSEQUENTIAL"

    def to_declaration(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
            "risk_level": self.risk_level
        }


class ToolRegistry:
    """Native registry discovering and executing agent tools."""

    def __init__(self):
        self._tools: Dict[str, Tool] = {}
        self._browser_service = BrowserService()
        self._computer_service = ComputerService()
        self._register_default_tools()

    def register(self, tool: Tool):
        self._tools[tool.name] = tool

    def get_tool(self, name: str) -> Optional[Tool]:
        return self._tools.get(name)

    def get_declarations(self) -> List[dict]:
        return [t.to_declaration() for t in self._tools.values()]

    async def execute(self, tool_name: str, arguments: Optional[dict] = None) -> Dict[str, Any]:
        arguments = arguments or {}
        tool = self.get_tool(tool_name)
        if not tool:
            return {
                "tool": tool_name,
                "success": False,
                "error": f"Tool '{tool_name}' is not registered.",
                "risk_level": "UNKNOWN"
            }

        try:
            import inspect
            if inspect.iscoroutinefunction(tool.func):
                res = await tool.func(**arguments)
            else:
                res = tool.func(**arguments)
            return {
                "tool": tool_name,
                "success": True,
                "result": res,
                "risk_level": tool.risk_level
            }
        except Exception as e:
            return {
                "tool": tool_name,
                "success": False,
                "error": str(e),
                "risk_level": tool.risk_level
            }

    def _register_default_tools(self):
        # --- BROWSER TOOLS ---
        self.register(Tool(
            name="browser_open",
            description="Navigate the browser to a specified web URL (HTTP or HTTPS only).",
            parameters={
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "The HTTP or HTTPS website URL to open."}
                },
                "required": ["url"]
            },
            func=self._browser_service.navigate,
            risk_level="SAFE_ACTION"
        ))

        self.register(Tool(
            name="browser_search",
            description="Search Google for a query string and extract readable search result text.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The Google search query string."}
                },
                "required": ["query"]
            },
            func=self._browser_service.search_google,
            risk_level="READ"
        ))

        self.register(Tool(
            name="browser_read",
            description="Read text content from the current active webpage.",
            parameters={
                "type": "object",
                "properties": {}
            },
            func=self._browser_service.get_page_text,
            risk_level="READ"
        ))

        self.register(Tool(
            name="browser_screenshot",
            description="Capture a screenshot image of the current active webpage.",
            parameters={
                "type": "object",
                "properties": {}
            },
            func=self._browser_service.screenshot,
            risk_level="READ"
        ))

        self.register(Tool(
            name="browser_current_url",
            description="Get the current active webpage URL.",
            parameters={
                "type": "object",
                "properties": {}
            },
            func=self._browser_service.get_current_url,
            risk_level="READ"
        ))

        # --- WINDOWS COMPUTER TOOLS ---
        self.register(Tool(
            name="computer_open_app",
            description="Open a supported Windows application from the allowlist (notepad, calculator, paint).",
            parameters={
                "type": "object",
                "properties": {
                    "app": {"type": "string", "description": "The application key: 'notepad', 'calculator', or 'paint'."}
                },
                "required": ["app"]
            },
            func=self._computer_service.open_app,
            risk_level="SAFE_ACTION"
        ))

        self.register(Tool(
            name="computer_type",
            description="Type text into the active focused Windows application window.",
            parameters={
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "The text string to type."}
                },
                "required": ["text"]
            },
            func=self._computer_service.type_text,
            risk_level="SAFE_ACTION"
        ))

        self.register(Tool(
            name="computer_click",
            description="Perform a mouse click at screen coordinates (x, y).",
            parameters={
                "type": "object",
                "properties": {
                    "x": {"type": "integer", "description": "X screen pixel coordinate."},
                    "y": {"type": "integer", "description": "Y screen pixel coordinate."},
                    "button": {"type": "string", "description": "Mouse button: 'left' or 'right'."}
                },
                "required": ["x", "y"]
            },
            func=self._computer_service.click,
            risk_level="SAFE_ACTION"
        ))

        self.register(Tool(
            name="computer_move_mouse",
            description="Move the mouse cursor to screen coordinates (x, y).",
            parameters={
                "type": "object",
                "properties": {
                    "x": {"type": "integer", "description": "X screen pixel coordinate."},
                    "y": {"type": "integer", "description": "Y screen pixel coordinate."}
                },
                "required": ["x", "y"]
            },
            func=self._computer_service.move_mouse,
            risk_level="SAFE_ACTION"
        ))

        self.register(Tool(
            name="computer_press_key",
            description="Press a single key (e.g. 'enter', 'esc', 'tab', 'backspace').",
            parameters={
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "The key string to press."}
                },
                "required": ["key"]
            },
            func=self._computer_service.press_key,
            risk_level="SAFE_ACTION"
        ))

        self.register(Tool(
            name="computer_hotkey",
            description="Execute a keyboard shortcut combination (e.g. ['ctrl', 'a'], ['ctrl', 'c'], ['ctrl', 'v']).",
            parameters={
                "type": "object",
                "properties": {
                    "keys": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of key strings forming shortcut combination."
                    }
                },
                "required": ["keys"]
            },
            func=self._computer_service.hotkey,
            risk_level="SAFE_ACTION"
        ))

        self.register(Tool(
            name="computer_screenshot",
            description="Capture a screenshot image of the entire Windows desktop.",
            parameters={
                "type": "object",
                "properties": {}
            },
            func=self._computer_service.screenshot,
            risk_level="READ"
        ))


default_registry = ToolRegistry()
