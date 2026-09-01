import os
import sqlite3
from pathlib import Path


def get_db_path() -> Path:
    """Return the absolute path to the SQLite database file at data/secondself.db or SECONDSELF_DATA_DIR."""
    custom_data_dir = os.getenv("SECONDSELF_DATA_DIR")
    if custom_data_dir:
        data_dir = Path(custom_data_dir)
    else:
        # Find project root directory (parent of backend)
        current_dir = Path(__file__).resolve().parent
        project_root = current_dir.parent.parent.parent
        data_dir = project_root / "data"

    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "secondself.db"


def get_db_connection():
    """Get a SQLite database connection with row factory enabled."""
    db_path = get_db_path()
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the SQLite database schema if not already created."""
    conn = get_db_connection()
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL,
                    content TEXT NOT NULL,
                    importance INTEGER DEFAULT 3,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
            """)
    finally:
        conn.close()
