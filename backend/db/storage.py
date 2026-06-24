import json
import sqlite3
from datetime import datetime
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path(__file__).parent / "physioai.db"


@contextmanager
def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                exercise_type TEXT NOT NULL,
                total_reps INTEGER DEFAULT 0,
                max_rom TEXT DEFAULT '{}',
                avg_symmetry REAL DEFAULT 100.0,
                total_compensations INTEGER DEFAULT 0,
                started_at TEXT NOT NULL,
                ended_at TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS session_frames (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                frame_num INTEGER,
                joint_angles TEXT,
                symmetry_score REAL,
                compensations TEXT,
                timestamp TEXT,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        """)


def create_session(session_id: str, exercise_type: str):
    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions (id, exercise_type, started_at) VALUES (?, ?, ?)",
            (session_id, exercise_type, datetime.now().isoformat()),
        )


def update_session(session_id: str, reps: int, max_rom: dict, avg_symmetry: float, total_compensations: int):
    with get_db() as conn:
        conn.execute(
            """UPDATE sessions
               SET total_reps=?, max_rom=?, avg_symmetry=?, total_compensations=?
               WHERE id=?""",
            (reps, json.dumps(max_rom), avg_symmetry, total_compensations, session_id),
        )


def end_session(session_id: str):
    with get_db() as conn:
        conn.execute(
            "UPDATE sessions SET ended_at=? WHERE id=?",
            (datetime.now().isoformat(), session_id),
        )


def save_frame(session_id: str, frame_num: int, angles: dict, symmetry: float, compensations: list):
    with get_db() as conn:
        conn.execute(
            """INSERT INTO session_frames (session_id, frame_num, joint_angles, symmetry_score, compensations, timestamp)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (session_id, frame_num, json.dumps(angles), symmetry, json.dumps(compensations), datetime.now().isoformat()),
        )


def get_session(session_id: str) -> dict | None:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone()
        if row:
            d = dict(row)
            d["max_rom"] = json.loads(d["max_rom"])
            return d
    return None


def get_all_sessions() -> list[dict]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM sessions ORDER BY started_at DESC").fetchall()
        results = []
        for row in rows:
            d = dict(row)
            d["max_rom"] = json.loads(d["max_rom"])
            results.append(d)
        return results


def get_session_history(exercise_type: str | None = None) -> list[dict]:
    """Get session history, optionally filtered by exercise type."""
    with get_db() as conn:
        if exercise_type:
            rows = conn.execute(
                "SELECT * FROM sessions WHERE exercise_type=? AND ended_at IS NOT NULL ORDER BY started_at",
                (exercise_type,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM sessions WHERE ended_at IS NOT NULL ORDER BY started_at"
            ).fetchall()
        results = []
        for row in rows:
            d = dict(row)
            d["max_rom"] = json.loads(d["max_rom"])
            results.append(d)
        return results


# Initialize DB on import
init_db()
