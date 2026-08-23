import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.computer.service import ComputerService
from app.tools.registry import ToolRegistry

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_computer_service():
    """Ensure computer control is reset to disabled after each test."""
    service = ComputerService()
    service.disable()
    yield
    service.disable()


def test_computer_service_disabled_by_default():
    """Verify computer control is disabled by default."""
    service = ComputerService()
    assert service.is_enabled() is False
    assert service.get_status()["enabled"] is False


@patch("pyautogui.Popen", create=True)
def test_app_allowlist_validation(mock_popen):
    """Verify application allowlist allows notepad, calculator, paint and rejects dangerous apps."""
    service = ComputerService()
    service.enable()

    with patch("subprocess.Popen") as mock_sub_popen:
        res1 = service.open_app("notepad")
        assert res1["status"] == "launched"

        res2 = service.open_app("calculator")
        assert res2["status"] == "launched"

        res3 = service.open_app("paint")
        assert res3["status"] == "launched"

    with pytest.raises(ValueError, match="Application 'cmd' is not supported"):
        service.open_app("cmd")

    with pytest.raises(ValueError, match="Application 'powershell' is not supported"):
        service.open_app("powershell")

    with pytest.raises(ValueError, match="is not supported"):
        service.open_app("C:\\Windows\\System32\\cmd.exe")


@patch("pyautogui.hotkey")
def test_hotkey_allowlist_validation(mock_pyautogui_hotkey):
    """Verify hotkey allowlist permits safe shortcuts and rejects unauthorized combinations."""
    service = ComputerService()
    service.enable()

    # Allowed Hotkeys
    res = service.hotkey(["ctrl", "a"])
    assert res["status"] == "executed"

    res2 = service.hotkey(["alt", "tab"])
    assert res2["status"] == "executed"

    # Unauthorized Hotkeys
    with pytest.raises(ValueError, match="not in the allowed hotkey set"):
        service.hotkey(["ctrl", "alt", "del"])

    with pytest.raises(ValueError, match="not in the allowed hotkey set"):
        service.hotkey(["win", "r"])


@patch("pyautogui.write")
@patch("pyautogui.click")
@patch("pyautogui.moveTo")
def test_coordinate_and_text_bounds_validation(mock_moveTo, mock_click, mock_write):
    """Verify screen coordinate and text length bounds checks."""
    service = ComputerService()
    service.enable()

    # Text length <= 2000 chars allowed
    res = service.type_text("Hello World")
    assert res["status"] == "typed"

    # Text length > 2000 chars rejected
    huge_text = "A" * 2005
    with pytest.raises(ValueError, match="exceeds maximum allowed limit"):
        service.type_text(huge_text)

    # Coordinate validation
    width, height = service._get_screen_size()
    with pytest.raises(ValueError, match="outside valid screen resolution"):
        service.click(x=-10, y=100)

    with pytest.raises(ValueError, match="outside valid screen resolution"):
        service.move_mouse(x=width + 500, y=100)


def test_disabled_action_permission_refusal():
    """Verify all desktop actions raise PermissionError when computer control is disabled."""
    service = ComputerService()
    service.disable()

    with pytest.raises(PermissionError, match="Computer control is disabled"):
        service.open_app("notepad")

    with pytest.raises(PermissionError, match="Computer control is disabled"):
        service.type_text("Hello")

    with pytest.raises(PermissionError, match="Computer control is disabled"):
        service.click(100, 100)

    with pytest.raises(PermissionError, match="Computer control is disabled"):
        service.move_mouse(100, 100)

    with pytest.raises(PermissionError, match="Computer control is disabled"):
        service.press_key("enter")

    with pytest.raises(PermissionError, match="Computer control is disabled"):
        service.hotkey(["ctrl", "a"])


def test_tool_registry_computer_tools_discovery():
    """Verify ToolRegistry contains the 7 registered computer tools."""
    registry = ToolRegistry()
    declarations = registry.get_declarations()
    names = [d["name"] for d in declarations]

    assert "computer_screenshot" in names
    assert "computer_move_mouse" in names
    assert "computer_click" in names
    assert "computer_type" in names
    assert "computer_press_key" in names
    assert "computer_hotkey" in names
    assert "computer_open_app" in names


def test_computer_api_endpoints():
    """Verify REST endpoints GET /api/computer/status, POST /api/computer/enable, POST /api/computer/disable."""
    # 1. GET status (disabled initially)
    res = client.get("/api/computer/status")
    assert res.status_code == 200
    assert res.json()["enabled"] is False

    # 2. POST enable
    res_enable = client.post("/api/computer/enable")
    assert res_enable.status_code == 200
    assert res_enable.json()["enabled"] is True

    # 3. POST disable
    res_disable = client.post("/api/computer/disable")
    assert res_disable.status_code == 200
    assert res_disable.json()["enabled"] is False
