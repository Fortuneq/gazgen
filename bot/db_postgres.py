"""
PostgreSQL database interface for GasGen with vector search
Replaces file-based storage with database storage
"""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from sentence_transformers import SentenceTransformer
from typing import Optional, List, Dict
from dotenv import load_dotenv
from io import BytesIO

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
_pool: Optional[SimpleConnectionPool] = None
_model: Optional[SentenceTransformer] = None

# Default emojis for models
_DEFAULT_MODEL_EMOJIS = {
    "nano_banana_pro": "🍌",
    "nano_banana_2": "🍌",
    "nano_banana": "🍌",
    "nano_strawberry": "🍓",
    "nano_peach": "🍑",
    "nano_mango": "🥭",
    "nano_kiwi": "🥝",
    "nano_cherry": "🍒",
    "nano_lemon": "🍋",
    "nano_grape": "🍇",
    "nano_melon": "🍈",
    "nano_orange": "🍊",
    "nano_pineapple": "🍍",
    "Unknown": "🎨",
}


def get_pool() -> SimpleConnectionPool:
    """Get or create connection pool"""
    global _pool
    if _pool is None:
        _pool = SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            **DB_CONFIG
        )
    return _pool


def get_model() -> SentenceTransformer:
    """Get or create sentence transformer model"""
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def get_connection():
    """Get a connection from the pool"""
    return get_pool().getconn()


def release_connection(conn):
    """Release connection back to pool"""
    get_pool().putconn(conn)


def get_category_emoji(category: str) -> str:
    """Get emoji for a category/model"""
    if not category:
        return "🎨"

    # Direct match
    if category in _DEFAULT_MODEL_EMOJIS:
        return _DEFAULT_MODEL_EMOJIS[category]

    # Partial match
    category_lower = category.lower()
    for key, emoji in _DEFAULT_MODEL_EMOJIS.items():
        if key.lower() in category_lower or category_lower in key.lower():
            return emoji

    return "🎨"


def get_all_categories() -> List[str]:
    """Get list of all available categories/models"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT name
                FROM categories
                WHERE post_count > 0
                ORDER BY post_count DESC
            """)
            return [row[0] for row in cursor.fetchall()]
    finally:
        release_connection(conn)


def get_categories_stats() -> Dict[str, int]:
    """Get dictionary of {category: count}"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT name, post_count
                FROM categories
                WHERE post_count > 0
                ORDER BY post_count DESC
            """)
            return {row[0]: row[1] for row in cursor.fetchall()}
    finally:
        release_connection(conn)


def get_post_by_id(post_id: int) -> Optional[Dict]:
    """Get post by ID"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT
                    p.id,
                    p.publication_id,
                    p.prompt,
                    p.model_name as category,
                    p.created_at,
                    p.metadata
                FROM posts p
                WHERE p.id = %s
            """, (post_id,))
            result = cursor.fetchone()
            if result:
                return dict(result)
            return None
    finally:
        release_connection(conn)


def get_random_post_by_category(category: str) -> Optional[Dict]:
    """Get random post from category with images"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT
                    p.id,
                    p.publication_id,
                    p.prompt,
                    p.model_name as category,
                    p.created_at,
                    p.metadata,
                    (SELECT image_data FROM images WHERE post_id = p.id AND image_type = 'result' LIMIT 1) as result_image,
                    (SELECT array_agg(image_data ORDER BY reference_order) FROM images WHERE post_id = p.id AND image_type = 'reference') as reference_images
                FROM posts p
                WHERE p.model_name = %s
                ORDER BY RANDOM()
                LIMIT 1
            """, (category,))
            result = cursor.fetchone()
            if result:
                post = dict(result)
                # Ensure reference_images is a list (array_agg returns None if no results)
                if post.get('reference_images') is None:
                    post['reference_images'] = []
                return post
            return None
    finally:
        release_connection(conn)


def get_posts_by_category(category: str, limit: int = 20) -> List[Dict]:
    """Get posts from category"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT
                    p.id,
                    p.publication_id,
                    p.prompt,
                    p.model_name as category,
                    p.created_at,
                    p.metadata
                FROM posts p
                WHERE p.model_name = %s
                ORDER BY RANDOM()
                LIMIT %s
            """, (category, limit))
            return [dict(row) for row in cursor.fetchall()]
    finally:
        release_connection(conn)


def search_similar_posts(
    query: str,
    n_results: int = 3,
    category_filter: Optional[str] = None
) -> List[Dict]:
    """
    Vector similarity search for posts
    Returns list of posts similar to the query
    """
    model = get_model()
    query_embedding = model.encode([query], normalize_embeddings=True)[0].tolist()

    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            if category_filter:
                cursor.execute("""
                    SELECT
                        p.id,
                        p.publication_id,
                        p.prompt,
                        p.model_name as category,
                        p.created_at,
                        p.metadata,
                        1 - (p.prompt_embedding <=> %s::vector) as similarity_score,
                        (SELECT image_data FROM images WHERE post_id = p.id AND image_type = 'result' LIMIT 1) as result_image,
                        (SELECT array_agg(image_data ORDER BY reference_order) FROM images WHERE post_id = p.id AND image_type = 'reference') as reference_images
                    FROM posts p
                    WHERE p.model_name = %s
                    ORDER BY p.prompt_embedding <=> %s::vector
                    LIMIT %s
                """, (query_embedding, category_filter, query_embedding, n_results))
            else:
                cursor.execute("""
                    SELECT
                        p.id,
                        p.publication_id,
                        p.prompt,
                        p.model_name as category,
                        p.created_at,
                        p.metadata,
                        1 - (p.prompt_embedding <=> %s::vector) as similarity_score,
                        (SELECT image_data FROM images WHERE post_id = p.id AND image_type = 'result' LIMIT 1) as result_image,
                        (SELECT array_agg(image_data ORDER BY reference_order) FROM images WHERE post_id = p.id AND image_type = 'reference') as reference_images
                    FROM posts p
                    ORDER BY p.prompt_embedding <=> %s::vector
                    LIMIT %s
                """, (query_embedding, query_embedding, n_results))

            results = []
            for row in cursor.fetchall():
                post = dict(row)
                # Ensure reference_images is a list
                if post.get('reference_images') is None:
                    post['reference_images'] = []
                results.append(post)
            return results
    finally:
        release_connection(conn)


def get_result_image(post_id: int) -> Optional[bytes]:
    """Get result image binary data for a post"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT image_data
                FROM images
                WHERE post_id = %s AND image_type = 'result'
                LIMIT 1
            """, (post_id,))
            result = cursor.fetchone()
            if result:
                return bytes(result[0])
            return None
    finally:
        release_connection(conn)


def get_reference_images(post_id: int) -> List[bytes]:
    """Get all reference images for a post"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT image_data
                FROM images
                WHERE post_id = %s AND image_type = 'reference'
                ORDER BY reference_order
            """, (post_id,))
            return [bytes(row[0]) for row in cursor.fetchall()]
    finally:
        release_connection(conn)


def get_post_with_images(post_id: int) -> Optional[Dict]:
    """Get post data with all images"""
    post = get_post_by_id(post_id)
    if not post:
        return None

    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Get result image
            cursor.execute("""
                SELECT filename, content_type, width, height, file_size
                FROM images
                WHERE post_id = %s AND image_type = 'result'
                LIMIT 1
            """, (post_id,))
            result_img = cursor.fetchone()
            if result_img:
                post['result_image'] = dict(result_img)

            # Get reference images
            cursor.execute("""
                SELECT filename, content_type, width, height, file_size, reference_order
                FROM images
                WHERE post_id = %s AND image_type = 'reference'
                ORDER BY reference_order
            """, (post_id,))
            post['reference_images'] = [dict(row) for row in cursor.fetchall()]

        return post
    finally:
        release_connection(conn)


def ensure_bot_user(telegram_id: int):
    """Ensure user row exists in users table (with 0 credits by default)."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (telegram_id, photo_credits, video_credits) "
                "VALUES (%s, 0, 0) ON CONFLICT (telegram_id) DO NOTHING",
                (telegram_id,)
            )
            conn.commit()
    finally:
        release_connection(conn)


def get_user_credits(telegram_id: int) -> int:
    """Get user's current photo credit balance."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT photo_credits FROM users WHERE telegram_id = %s",
                (telegram_id,)
            )
            row = cur.fetchone()
            return row[0] if row else 0
    finally:
        release_connection(conn)


def get_model_cost(model_key: str) -> int:
    """Get credit cost for a model from model_prices table, default 1."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT credit_cost FROM model_prices WHERE model_key = %s",
                (model_key,)
            )
            row = cur.fetchone()
            return row[0] if row else 1
    finally:
        release_connection(conn)


def check_and_deduct_credits(telegram_id: int, model_key: str, task_id: str = "") -> tuple:
    """Check credits and deduct if sufficient.

    Returns (success, cost, remaining).
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cost = get_model_cost(model_key)

            # Ensure user exists
            cur.execute(
                "INSERT INTO users (telegram_id, photo_credits, video_credits) "
                "VALUES (%s, 0, 0) ON CONFLICT (telegram_id) DO NOTHING",
                (telegram_id,)
            )

            cur.execute(
                "SELECT photo_credits FROM users WHERE telegram_id = %s",
                (telegram_id,)
            )
            row = cur.fetchone()
            balance = row[0] if row else 0

            if balance < cost:
                conn.commit()
                return (False, cost, balance)

            # Deduct credits
            cur.execute(
                "UPDATE users SET photo_credits = photo_credits - %s "
                "WHERE telegram_id = %s AND photo_credits >= %s",
                (cost, telegram_id, cost)
            )

            # Log transaction
            cur.execute(
                "INSERT INTO credit_transactions "
                "(telegram_id, credit_type, amount, reason, task_id) "
                "VALUES (%s, 'photo', %s, 'generation', %s)",
                (telegram_id, -cost, task_id)
            )

            conn.commit()
            return (True, cost, balance - cost)
    finally:
        release_connection(conn)


def close_pool():
    """Close all connections in the pool"""
    global _pool
    if _pool:
        _pool.closeall()
        _pool = None
