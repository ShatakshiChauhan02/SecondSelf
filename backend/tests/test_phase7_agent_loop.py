import pytest
import asyncio
from app.agent.task_model import Task, TaskStatus, TaskStep, Observation
from app.agent.actions import map_action_to_tool
from app.agent.task_repository import TaskRepository
from app.agent.agent import AgentCore


def test_task_model_initialization():
    task = Task(user_goal="Open Notepad and type test")
    assert task.task_id.startswith("task_")
    assert task.status == TaskStatus.IDLE
    assert len(task.plan) == 0
    assert len(task.observations) == 0


def test_action_vocabulary_mapping():
    tool, args = map_action_to_tool("OPEN_APPLICATION", {"app_name": "notepad"})
    assert tool == "computer_open_app"
    assert args["app_name"] == "notepad"

    tool2, args2 = map_action_to_tool("DOUBLE_CLICK", {"x": 100, "y": 200})
    assert tool2 == "computer_click"
    assert args2["clicks"] == 2


def test_task_repository_persistence():
    repo = TaskRepository()
    task = Task(user_goal="Test persistent task record", status=TaskStatus.COMPLETED)
    task.result_summary = "Successfully completed task"
    repo.save_task(task)

    fetched = repo.get_task(task.task_id)
    assert fetched is not None
    assert fetched["task_id"] == task.task_id
    assert fetched["user_goal"] == "Test persistent task record"
    assert fetched["status"] == "COMPLETED"


def test_task_cancellation():
    task = Task(user_goal="Task to cancel")
    AgentCore._active_tasks[task.task_id] = task

    success = AgentCore.cancel_task(task.task_id)
    assert success is True
    assert AgentCore.get_task(task.task_id).status == TaskStatus.CANCELLED
