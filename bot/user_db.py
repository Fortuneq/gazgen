"""
User management for Photix bot — token balance
Uses the same PostgreSQL 'users' table as the webapp (single source of truth)
"""
import logging
from typing import Optional, Dict
from bot.db_postgres import get_connection, release_connection

logger = logging.getLogger(__name__)


def ensure_users_table():
    """Ensure users table exists (created by webapp migrations, but ensure bot_users compat)."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Ensure the main users table has needed columns
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    telegram_id BIGINT UNIQUE,
                    username VARCHAR(255),
                    first_name VARCHAR(255),
                    photo_credits INTEGER DEFAULT 0,
                    video_credits INTEGER DEFAULT 0,
                    total_generations INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # Add total_generations column if missing (older schema)
            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'users' AND column_name = 'total_generations'
                    ) THEN
                        ALTER TABLE users ADD COLUMN total_generations INTEGER DEFAULT 0;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'users' AND column_name = 'first_name'
                    ) THEN
                        ALTER TABLE users ADD COLUMN first_name VARCHAR(255);
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'users' AND column_name = 'username'
                    ) THEN
                        ALTER TABLE users ADD COLUMN username VARCHAR(255);
                    END IF;
                END $$;
            """)
            conn.commit()
            logger.info("users table ensured")
    except Exception as e:
        conn.rollback()
        logger.error("Error ensuring users table: %s", e)
    finally:
        release_connection(conn)


def get_or_create_user(user_id: int, username: str = None, first_name: str = None) -> Dict:
    """Get existing user or create new one with 0 tokens (no free tokens)."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT telegram_id, username, first_name, photo_credits, total_generations "
                "FROM users WHERE telegram_id = %s",
                (user_id,)
            )
            row = cur.fetchone()
            if row:
                # Update username/first_name if changed
                if (username and username != row[1]) or (first_name and first_name != row[2]):
                    cur.execute(
                        "UPDATE users SET username = COALESCE(%s, username), "
                        "first_name = COALESCE(%s, first_name) WHERE telegram_id = %s",
                        (username, first_name, user_id)
                    )
                    conn.commit()
                return {
                    "user_id": row[0], "username": row[1] or "", "first_name": row[2] or "",
                    "tokens": row[3], "total_generations": row[4] or 0,
                }
            # Create new user with 0 tokens
            cur.execute(
                "INSERT INTO users (telegram_id, username, first_name, photo_credits, video_credits, total_generations) "
                "VALUES (%s, %s, %s, 0, 0, 0) "
                "ON CONFLICT (telegram_id) DO UPDATE SET "
                "username = COALESCE(EXCLUDED.username, users.username), "
                "first_name = COALESCE(EXCLUDED.first_name, users.first_name) "
                "RETURNING photo_credits",
                (user_id, username or "", first_name or "")
            )
            conn.commit()
            return {
                "user_id": user_id, "username": username or "", "first_name": first_name or "",
                "tokens": 0, "total_generations": 0,
            }
    except Exception as e:
        conn.rollback()
        logger.error("Error in get_or_create_user: %s", e)
        return {"user_id": user_id, "tokens": 0, "total_generations": 0}
    finally:
        release_connection(conn)


def get_balance(user_id: int) -> int:
    """Get user's token balance from the users table (photo_credits)."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT photo_credits FROM users WHERE telegram_id = %s", (user_id,))
            row = cur.fetchone()
            return row[0] if row else 0
    finally:
        release_connection(conn)


def deduct_tokens(user_id: int, amount: int) -> bool:
    """Deduct tokens. Returns True if successful, False if insufficient balance."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET photo_credits = photo_credits - %s, "
                "total_generations = COALESCE(total_generations, 0) + 1 "
                "WHERE telegram_id = %s AND photo_credits >= %s "
                "RETURNING photo_credits",
                (amount, user_id, amount)
            )
            row = cur.fetchone()
            conn.commit()
            return row is not None
    except Exception as e:
        conn.rollback()
        logger.error("Error deducting tokens: %s", e)
        return False
    finally:
        release_connection(conn)


def add_tokens(user_id: int, amount: int) -> int:
    """Add tokens to user. Returns new balance."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET photo_credits = photo_credits + %s "
                "WHERE telegram_id = %s RETURNING photo_credits",
                (amount, user_id)
            )
            row = cur.fetchone()
            conn.commit()
            return row[0] if row else 0
    except Exception as e:
        conn.rollback()
        logger.error("Error adding tokens: %s", e)
        return 0
    finally:
        release_connection(conn)


def get_user_stats(user_id: int) -> Optional[Dict]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT telegram_id, username, first_name, photo_credits, "
                "total_generations, created_at FROM users WHERE telegram_id = %s",
                (user_id,)
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "user_id": row[0], "username": row[1] or "", "first_name": row[2] or "",
                "tokens": row[3], "total_generations": row[4] or 0,
                "created_at": row[5],
            }
    finally:
        release_connection(conn)
