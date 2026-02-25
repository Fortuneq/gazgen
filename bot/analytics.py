"""
User analytics and metrics tracking module
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from typing import Optional, Dict, List
from dotenv import load_dotenv
from datetime import datetime
import json

load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'gasgen'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', ''),
}

# Connection pool
_analytics_pool: Optional[SimpleConnectionPool] = None


def get_analytics_pool() -> SimpleConnectionPool:
    """Get or create analytics connection pool"""
    global _analytics_pool
    if _analytics_pool is None:
        _analytics_pool = SimpleConnectionPool(
            minconn=1,
            maxconn=5,
            **DB_CONFIG
        )
    return _analytics_pool


def get_analytics_connection():
    """Get a connection from the analytics pool"""
    return get_analytics_pool().getconn()


def release_analytics_connection(conn):
    """Release connection back to analytics pool"""
    get_analytics_pool().putconn(conn)


# User Management

def get_or_create_user(
    telegram_id: int,
    username: str = None,
    first_name: str = None,
    last_name: str = None,
    language_code: str = None,
    is_premium: bool = False
) -> int:
    """Get existing user or create new one, returns user_id"""
    conn = get_analytics_connection()
    try:
        with conn.cursor() as cursor:
            # Try to get existing user
            cursor.execute("SELECT id FROM users WHERE telegram_id = %s", (telegram_id,))
            result = cursor.fetchone()

            if result:
                user_id = result[0]
                # Update user info and last active
                cursor.execute("""
                    UPDATE users
                    SET username = COALESCE(%s, username),
                        first_name = COALESCE(%s, first_name),
                        last_name = COALESCE(%s, last_name),
                        language_code = COALESCE(%s, language_code),
                        is_premium = %s,
                        last_active_at = NOW()
                    WHERE id = %s
                """, (username, first_name, last_name, language_code, is_premium, user_id))
            else:
                # Create new user
                cursor.execute("""
                    INSERT INTO users (telegram_id, username, first_name, last_name, language_code, is_premium)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (telegram_id, username, first_name, last_name, language_code, is_premium))
                user_id = cursor.fetchone()[0]

            conn.commit()
            return user_id
    finally:
        release_analytics_connection(conn)


def update_user_last_active(telegram_id: int):
    """Update user's last active timestamp"""
    conn = get_analytics_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE users SET last_active_at = NOW()
                WHERE telegram_id = %s
            """, (telegram_id,))
            conn.commit()
    finally:
        release_analytics_connection(conn)


# Action Tracking

def track_action(telegram_id: int, action_type: str, action_data: Dict = None):
    """Track user action"""
    conn = get_analytics_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT track_user_action(%s, %s, %s::jsonb)
            """, (telegram_id, action_type, json.dumps(action_data or {})))
            conn.commit()
    finally:
        release_analytics_connection(conn)


def track_button_click(
    telegram_id: int,
    button_type: str,
    button_data: str = None,
    context: Dict = None
):
    """Track button click"""
    conn = get_analytics_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT track_button_click(%s, %s, %s, %s::jsonb)
            """, (telegram_id, button_type, button_data, json.dumps(context or {})))
            conn.commit()
    finally:
        release_analytics_connection(conn)


def track_model_usage(
    telegram_id: int,
    model_name: str,
    post_id: int = None,
    search_query: str = None
):
    """Track model/category usage"""
    conn = get_analytics_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT track_model_usage(%s, %s, %s, %s)
            """, (telegram_id, model_name, post_id, search_query))
            conn.commit()
    finally:
        release_analytics_connection(conn)


def track_search_query(
    telegram_id: int,
    query_text: str,
    category_filter: str = None,
    results_count: int = 0
):
    """Track search query"""
    user_id = get_or_create_user(telegram_id)
    conn = get_analytics_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO search_queries (user_id, query_text, category_filter, results_count)
                VALUES (%s, %s, %s, %s)
            """, (user_id, query_text, category_filter, results_count))
            conn.commit()

            # Also track as action
            track_action(telegram_id, 'search', {
                'query': query_text,
                'category': category_filter,
                'results': results_count
            })
    finally:
        release_analytics_connection(conn)


# Analytics Queries

def get_user_stats(telegram_id: int) -> Optional[Dict]:
    """Get statistics for a specific user"""
    conn = get_analytics_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT * FROM user_activity_summary
                WHERE telegram_id = %s
            """, (telegram_id,))
            result = cursor.fetchone()
            return dict(result) if result else None
    finally:
        release_analytics_connection(conn)


def get_popular_models(limit: int = 10) -> List[Dict]:
    """Get most popular models"""
    conn = get_analytics_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT * FROM popular_models
                LIMIT %s
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]
    finally:
        release_analytics_connection(conn)


def get_button_stats() -> List[Dict]:
    """Get button click statistics"""
    conn = get_analytics_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT * FROM button_stats")
            return [dict(row) for row in cursor.fetchall()]
    finally:
        release_analytics_connection(conn)


def get_daily_active_users(days: int = 30) -> List[Dict]:
    """Get daily active users for last N days"""
    conn = get_analytics_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT
                    DATE(created_at) as date,
                    COUNT(DISTINCT user_id) as active_users
                FROM user_actions
                WHERE created_at >= NOW() - INTERVAL '%s days'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            """, (days,))
            return [dict(row) for row in cursor.fetchall()]
    finally:
        release_analytics_connection(conn)


def get_hourly_activity() -> List[Dict]:
    """Get hourly activity pattern"""
    conn = get_analytics_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT * FROM hourly_activity ORDER BY hour")
            return [dict(row) for row in cursor.fetchall()]
    finally:
        release_analytics_connection(conn)


def get_most_active_users(limit: int = 20) -> List[Dict]:
    """Get most active users"""
    conn = get_analytics_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT * FROM most_active_users LIMIT %s", (limit,))
            return [dict(row) for row in cursor.fetchall()]
    finally:
        release_analytics_connection(conn)


def get_total_users() -> int:
    """Get total number of users"""
    conn = get_analytics_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM users")
            return cursor.fetchone()[0]
    finally:
        release_analytics_connection(conn)


def get_new_users_today() -> int:
    """Get number of new users today"""
    conn = get_analytics_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM users
                WHERE DATE(created_at) = CURRENT_DATE
            """)
            return cursor.fetchone()[0]
    finally:
        release_analytics_connection(conn)


def get_active_users_today() -> int:
    """Get number of active users today"""
    conn = get_analytics_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(DISTINCT user_id) FROM user_actions
                WHERE DATE(created_at) = CURRENT_DATE
            """)
            return cursor.fetchone()[0]
    finally:
        release_analytics_connection(conn)


def close_analytics_pool():
    """Close all connections in the analytics pool"""
    global _analytics_pool
    if _analytics_pool:
        _analytics_pool.closeall()
        _analytics_pool = None
