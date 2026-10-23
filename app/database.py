
import sqlite3
from pathlib import Path
from datetime import datetime, timezone

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATABASE_PATH = PROJECT_ROOT / "neurachat.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def current_timestamp():
    return datetime.now(timezone.utc).isoformat()


def init_db():
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL DEFAULT 'New chat',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                role TEXT NOT NULL
                    CHECK (role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id)
                    REFERENCES conversations(id)
                    ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS
                idx_messages_conversation_id
            ON messages(conversation_id);

            CREATE INDEX IF NOT EXISTS
                idx_conversations_updated_at
            ON conversations(updated_at);
            """
        )


def create_conversation(title="New chat"):
    timestamp = current_timestamp()

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO conversations (title, created_at, updated_at)
            VALUES (?, ?, ?)
            """,
            (title, timestamp, timestamp),
        )
        conversation_id = cursor.lastrowid

    return get_conversation(conversation_id)


def list_conversations():
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                c.id,
                c.title,
                c.created_at,
                c.updated_at,
                COUNT(m.id) AS message_count
            FROM conversations AS c
            LEFT JOIN messages AS m
                ON m.conversation_id = c.id
            GROUP BY c.id
            ORDER BY c.updated_at DESC
            """
        ).fetchall()

    return [dict(row) for row in rows]


def get_conversation(conversation_id):
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, title, created_at, updated_at
            FROM conversations
            WHERE id = ?
            """,
            (conversation_id,),
        ).fetchone()

    return dict(row) if row else None


def get_messages(conversation_id):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, conversation_id, role, content, created_at
            FROM messages
            WHERE conversation_id = ?
            ORDER BY id ASC
            """,
            (conversation_id,),
        ).fetchall()

    return [dict(row) for row in rows]


def add_message(conversation_id, role, content):
    if role not in ("user", "assistant"):
        raise ValueError("Role must be 'user' or 'assistant'.")

    timestamp = current_timestamp()

    with get_connection() as connection:
        conversation = connection.execute(
            "SELECT id FROM conversations WHERE id = ?",
            (conversation_id,),
        ).fetchone()

        if conversation is None:
            raise ValueError("Conversation not found.")

        cursor = connection.execute(
            """
            INSERT INTO messages (
                conversation_id, role, content, created_at
            )
            VALUES (?, ?, ?, ?)
            """,
            (conversation_id, role, content, timestamp),
        )

        # Use the first user message as the conversation title.
        if role == "user":
            connection.execute(
                """
                UPDATE conversations
                SET title = CASE
                    WHEN title = 'New chat' THEN ?
                    ELSE title
                END,
                updated_at = ?
                WHERE id = ?
                """,
                (content[:60], timestamp, conversation_id),
            )
        else:
            connection.execute(
                """
                UPDATE conversations
                SET updated_at = ?
                WHERE id = ?
                """,
                (timestamp, conversation_id),
            )

        message_id = cursor.lastrowid

    return {
        "id": message_id,
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "created_at": timestamp,
    }


def rename_conversation(conversation_id: int, title: str):
    title = title.strip()

    if not title:
        raise ValueError("Conversation title cannot be empty.")

    if len(title) > 100:
        raise ValueError("Conversation title must be 100 characters or fewer.")

    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE conversations
            SET title = ?, updated_at = ?
            WHERE id = ?
            """,
            (title, current_timestamp(), conversation_id),
        )

        if cursor.rowcount == 0:
            return None

    return get_conversation(conversation_id)


def delete_conversation(conversation_id: int):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM conversations WHERE id = ?",
            (conversation_id,),
        )

    return cursor.rowcount > 0


# Create the database and tables when this module is initialized.
init_db()
