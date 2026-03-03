"""
Database interface - uses PostgreSQL instead of ChromaDB
This module provides compatibility layer for existing bot code
"""
import psycopg2
import os
from dotenv import load_dotenv
from typing import List, Dict

from bot.db_postgres import (
    get_model,
    get_all_categories,
    get_categories_stats,
    get_category_emoji,
    get_random_post_by_category,
    search_similar_posts,
    get_result_image,
    get_reference_images,
    get_post_by_id,
    get_connection,
    release_connection,
    ensure_bot_user,
    get_user_credits,
    get_model_cost,
    check_and_deduct_credits,
)

load_dotenv()

def get_all_posts() -> List[Dict]:
    """Get all posts from database - stub for compatibility"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM posts")
            count = cursor.fetchone()[0]
            return [{"id": i} for i in range(count)]  # Minimal stub
    finally:
        release_connection(conn)

# Re-export all functions for compatibility
__all__ = [
    'get_model',
    'get_all_posts',
    'get_all_categories',
    'get_categories_stats',
    'get_category_emoji',
    'get_random_post_by_category',
    'search_similar_posts',
    'get_result_image',
    'get_reference_images',
    'get_post_by_id',
    'ensure_bot_user',
    'get_user_credits',
    'get_model_cost',
    'check_and_deduct_credits',
]
