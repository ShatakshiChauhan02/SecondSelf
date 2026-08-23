import os
import uuid
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional

try:
    import pyautogui
    pyautogui.FAILSAFE = True
except ImportError:
    pyautogui = None


class ComputerService:
    """
    Singleton service encapsulating PyAutoGUI Windows desktop interactions.
    Requires explicit user approval (enabled = True) before performing desktop actions.
    """
    _instance: Optional['ComputerService'] = None

    # Strict Allowlists
    ALLOWED_APPS = {
        "notepad": "notepad.exe",
        "calculator": "calc.exe",
        "paint": "mspaint.exe"
    }

    ALLOWED_KEYS = {
        "enter", "esc", "tab", "space", "backspace", "delete",
        "up", "down", "left", "right", "home", "end"
    }

    ALLOWED_HOTKEYS = {
        "ctrl+a", "ctrl+c", "ctrl+v", "ctrl+x", "ctrl+s", "ctrl+z", "alt+tab"
    }

    MAX_TEXT_LENGTH = 2000

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ComputerService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._enabled: bool = False
        self._last_action: str = "Disabled"
        self._screenshots_dir = self._get_screenshots_dir()

    def _get_screenshots_dir(self) -> Path:
        current_dir = Path(__file__).resolve().parent
        project_root = current_dir.parent.parent.parent
        dir_path = project_root / "data" / "screenshots" / "computer"
        dir_path.mkdir(parents=True, exist_ok=True)
        return dir_path

    def enable(self) -> bool:
        self._enabled = True
        self._last_action = "Computer Control Enabled"
        return True

    def disable(self) -> bool:
        self._enabled = False
        self._last_action = "Computer Control Disabled"
        return False

    def is_enabled(self) -> bool:
        return self._enabled

    def _check_enabled(self):
        if not self._enabled:
            raise PermissionError("Computer control is disabled. User approval is required via the frontend UI before executing desktop actions.")

    def _get_screen_size(self):
        if pyautogui:
            try:
                return pyautogui.size()
            except Exception:
                pass
        return 1920, 1080

    def open_app(self, app: str) -> Dict[str, Any]:
        """Launch a Windows application from the strict application allowlist."""
        self._check_enabled()
        clean_app = app.lower().strip()
        
        if clean_app not in self.ALLOWED_APPS:
            raise ValueError(f"Application '{clean_app}' is not supported. Supported applications are: {', '.join(self.ALLOWED_APPS.keys())}.")
        
        exe_name = self.ALLOWED_APPS[clean_app]
        try:
            subprocess.Popen([exe_name], shell=False)
            self._last_action = f"Opened {clean_app}"
            return {
                "app": clean_app,
                "executable": exe_name,
                "status": "launched"
            }
        except Exception as e:
            raise RuntimeError(f"Failed to launch application '{clean_app}': {str(e)}")

    def move_mouse(self, x: int, y: int) -> Dict[str, Any]:
        """Move mouse cursor to specified x, y coordinates."""
        self._check_enabled()
        width, height = self._get_screen_size()

        if x < 0 or x > width or y < 0 or y > height:
            raise ValueError(f"Target coordinates ({x}, {y}) are outside valid screen resolution ({width}x{height}).")

        if pyautogui:
            pyautogui.moveTo(x, y, duration=0.25)
        
        self._last_action = f"Moved mouse to ({x}, {y})"
        return {"x": x, "y": y, "status": "moved"}

    def click(self, x: int, y: int, button: str = "left") -> Dict[str, Any]:
        """Perform a mouse click at specified coordinates."""
        self._check_enabled()
        width, height = self._get_screen_size()
        clean_button = button.lower().strip()

        if clean_button not in ("left", "right"):
            raise ValueError("Only 'left' and 'right' mouse buttons are permitted.")

        if x < 0 or x > width or y < 0 or y > height:
            raise ValueError(f"Target coordinates ({x}, {y}) are outside valid screen resolution ({width}x{height}).")

        if pyautogui:
            pyautogui.click(x=x, y=y, button=clean_button)
        
        self._last_action = f"Clicked {clean_button} at ({x}, {y})"
        return {"x": x, "y": y, "button": clean_button, "status": "clicked"}

    def type_text(self, text: str) -> Dict[str, Any]:
        """Type text into active focused Windows window."""
        self._check_enabled()
        if len(text) > self.MAX_TEXT_LENGTH:
            raise ValueError(f"Text length exceeds maximum allowed limit of {self.MAX_TEXT_LENGTH} characters.")

        if pyautogui:
            pyautogui.write(text, interval=0.01)

        self._last_action = f"Typed '{text[:30]}...'" if len(text) > 30 else f"Typed '{text}'"
        return {"length": len(text), "status": "typed"}

    def press_key(self, key: str) -> Dict[str, Any]:
        """Press a single key from the allowed key set."""
        self._check_enabled()
        clean_key = key.lower().strip()

        if clean_key not in self.ALLOWED_KEYS and len(clean_key) != 1:
            raise ValueError(f"Key '{clean_key}' is not permitted. Supported keys include standard characters and: {', '.join(self.ALLOWED_KEYS)}.")

        if pyautogui:
            pyautogui.press(clean_key)

        self._last_action = f"Pressed key '{clean_key}'"
        return {"key": clean_key, "status": "pressed"}

    def hotkey(self, keys: List[str]) -> Dict[str, Any]:
        """Execute a keyboard shortcut from the allowed hotkey list."""
        self._check_enabled()
        clean_keys = [k.lower().strip() for k in keys]
        combo_str = "+".join(clean_keys)

        if combo_str not in self.ALLOWED_HOTKEYS:
            raise ValueError(f"Hotkey combination '{combo_str}' is not in the allowed hotkey set ({', '.join(self.ALLOWED_HOTKEYS)}).")

        if pyautogui:
            pyautogui.hotkey(*clean_keys)

        self._last_action = f"Executed hotkey '{combo_str}'"
        return {"hotkey": combo_str, "status": "executed"}

    def screenshot(self) -> Dict[str, Any]:
        """Capture desktop screenshot."""
        file_name = f"desktop_{uuid.uuid4().hex[:8]}.png"
        file_path = self._screenshots_dir / file_name

        if pyautogui:
            pyautogui.screenshot(str(file_path))
        else:
            # Create placeholder image file for testing if pyautogui is mocked
            file_path.write_bytes(b"")

        self._last_action = f"Captured desktop screenshot {file_name}"
        return {
            "file_name": file_name,
            "file_path": str(file_path)
        }

    def get_status(self) -> Dict[str, Any]:
        """Return status dictionary for GET /api/computer/status."""
        width, height = self._get_screen_size()
        return {
            "enabled": self._enabled,
            "screen_width": width,
            "screen_height": height,
            "last_action": self._last_action
        }
