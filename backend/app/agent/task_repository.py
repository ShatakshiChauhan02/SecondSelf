import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.memory.database import get_db_connection
from app.agent.task_model import Task, TaskStatus


class TaskRepository:
    """Repository handling SQLite database persistence for agent tasks."""

    def __init__(self):
        self._init_task_table()

    def _init_task_table(self):
        conn = get_db_connection()
        try:
            with conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS agent_tasks (
                        task_id TEXT PRIMARY KEY,
                        user_goal TEXT NOT NULL,
                        status TEXT NOT NULL,
                        plan_json TEXT,
                        result_summary TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    );
                """)
                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
                """)
        finally:
            conn.close()

    def save_task(self, task: Task):
        conn = get_db_connection()
        now = datetime.now(timezone.utc).isoformat()
        plan_json = json.dumps([step.model_dump() for step in task.plan])
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO agent_tasks (task_id, user_goal, status, plan_json, result_summary, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(task_id) DO UPDATE SET
                        status=excluded.status,
                        plan_json=excluded.plan_json,
                        result_summary=excluded.result_summary,
                        updated_at=excluded.updated_at
                    """,
                    (
                        task.task_id,
                        task.user_goal,
                        task.status.value,
                        plan_json,
                        task.result_summary or "",
                        task.created_at,
                        now
                    )
                )
        finally:
            conn.close()

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM agent_tasks WHERE task_id = ?", (task_id,)).fetchone()
            if not row:
                return None
            return {
                "task_id": row["task_id"],
                "user_goal": row["user_goal"],
                "status": row["status"],
                "plan": json.loads(row["plan_json"]) if row["plan_json"] else [],
                "result_summary": row["result_summary"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"]
            }
        finally:
            conn.close()

    def list_tasks(self, limit: int = 20) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            rows = conn.execute("SELECT * FROM agent_tasks ORDER BY updated_at DESC LIMIT ?", (limit,)).fetchall()
            return [
                {
                    "task_id": r["task_id"],
                    "user_goal": r["user_goal"],
                    "status": r["status"],
                    "result_summary": r["result_summary"],
                    "updated_at": r["updated_at"]
                }
                for r in rows
            ]
        finally:
            conn.close()
