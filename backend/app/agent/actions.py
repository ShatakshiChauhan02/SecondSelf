"""
SecondSelf Controlled Action Vocabulary.
Maps high-level agent action intents directly to existing native ToolRegistry tools.
"""

from typing import Dict, Any, Optional, Tuple

ACTION_VOCABULARY = {
    "OPEN_APPLICATION": "computer_open_app",
    "CLICK": "computer_click",
    "DOUBLE_CLICK": "computer_click",
    "TYPE_TEXT": "computer_type",
    "PRESS_KEY": "computer_press_key",
    "HOTKEY": "computer_hotkey",
    "MOVE_MOUSE": "computer_move_mouse",
    "TAKE_SCREENSHOT": "computer_screenshot",
    "BROWSER_NAVIGATE": "browser_open",
    "BROWSER_SEARCH": "browser_search",
    "BROWSER_READ": "browser_read",
    "BROWSER_SCREENSHOT": "browser_screenshot",
    "BROWSER_URL": "browser_current_url",
}


def map_action_to_tool(action_name: str, arguments: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """
    Map controlled action name to native tool name and normalize arguments.
    """
    upper_action = action_name.upper().strip()
    tool_name = ACTION_VOCABULARY.get(upper_action, action_name.lower())
    
    normalized_args = dict(arguments)
    if upper_action == "DOUBLE_CLICK":
        normalized_args["clicks"] = 2

    return tool_name, normalized_args
