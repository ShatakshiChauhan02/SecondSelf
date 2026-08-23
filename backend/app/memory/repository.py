from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.memory.database import get_db_connection, init_db


class MemoryRepository:
    """Repository handling direct SQLite queries for the memories table."""

    def __init__(self):
        init_db()

    @staticmethod
    def _row_to_dict(row) -> Dict[str, Any]:
        return {
            "id": row["id"],
            "category": row["category"],
            "content": row["content"],
            "importance": row["importance"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def add(self, category: str, content: str, importance: int = 3) -> Dict[str, Any]:
        """Insert a new memory record into SQLite."""
        init_db()
        now = datetime.now(timezone.utc).isoformat()
        clean_category = category.lower().strip() if category else "preference"
        clean_content = content.strip()

        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.execute(
                    """
                    INSERT INTO memories (category, content, importance, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (clean_category, clean_content, importance, now, now)
                )
                memory_id = cursor.lastrowid
                row = conn.execute("SELECT * FROM memories WHERE id = ?", (memory_id,)).fetchone()
                return self._row_to_dict(row)
        finally:
            conn.close()

    def get_by_id(self, memory_id: int) -> Optional[Dict[str, Any]]:
        """Fetch a single memory record by ID."""
        init_db()
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM memories WHERE id = ?", (memory_id,)).fetchone()
            return self._row_to_dict(row) if row else None
        finally:
            conn.close()

    def list_all(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """List stored memories ordered by importance and timestamp."""
        init_db()
        conn = get_db_connection()
        try:
            if category:
                rows = conn.execute(
                    "SELECT * FROM memories WHERE category = ? ORDER BY importance DESC, updated_at DESC",
                    (category.lower().strip(),)
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM memories ORDER BY importance DESC, updated_at DESC"
                ).fetchall()
            return [self._row_to_dict(row) for row in rows]
        finally:
            conn.close()

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search memory content by SQL LIKE query matching keywords."""
        init_db()
        conn = get_db_connection()
        try:
            like_pattern = f"%{query.strip()}%"
            rows = conn.execute(
                """
                SELECT * FROM memories 
                WHERE content LIKE ? OR category LIKE ?
                ORDER BY importance DESC, updated_at DESC
                LIMIT ?
                """,
                (like_pattern, like_pattern, limit)
            ).fetchall()
            return [self._row_to_dict(row) for row in rows]
        finally:
            conn.close()

    def delete_by_id(self, memory_id: int) -> bool:
        """Delete a memory record by ID."""
        init_db()
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
                return cursor.rowcount > 0
        finally:
            conn.close()

    def delete_by_content_keyword(self, keyword: str) -> int:
        """Delete memories matching a content keyword (used for explicit forget commands)."""
        init_db()
        conn = get_db_connection()
        try:
            with conn:
                like_pattern = f"%{keyword.strip()}%"
                cursor = conn.execute("DELETE FROM memories WHERE content LIKE ?", (like_pattern,))
                return cursor.rowcount
        finally:
            conn.close()
