import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from webapp.db import init_pool, close_pool, get_pool
from webapp.image_cache import image_cache
from webapp.routers import categories, posts, images, search, generate, tags, profile, payments

logger = logging.getLogger(__name__)


async def _warmup_cover_cache():
    """Pre-load tag and category cover images into memory cache at startup."""
    pool = get_pool()

    # Tag covers
    tag_rows = await pool.fetch(
        """
        SELECT DISTINCT unnest(tags) AS tag FROM posts
        WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
        """
    )
    for tr in tag_rows:
        tag_name = tr["tag"]
        row = await pool.fetchrow(
            """
            SELECT i.image_data, i.content_type
            FROM images i JOIN posts p ON p.id = i.post_id
            WHERE $1 = ANY(p.tags) AND i.image_type = 'result'
            ORDER BY p.id DESC LIMIT 1
            """,
            tag_name,
        )
        if row and row["image_data"]:
            image_cache.put(
                f"tag_cover:{tag_name}",
                bytes(row["image_data"]),
                row["content_type"] or "image/jpeg",
            )

    # Category covers
    cat_rows = await pool.fetch(
        "SELECT name FROM categories WHERE post_count > 0"
    )
    for cr in cat_rows:
        name = cr["name"]
        row = await pool.fetchrow(
            """
            SELECT i.image_data, i.content_type
            FROM images i JOIN posts p ON i.post_id = p.id
            WHERE p.model_name = $1 AND i.image_type = 'result'
            ORDER BY p.id DESC LIMIT 1
            """,
            name,
        )
        if row and row["image_data"]:
            image_cache.put(
                f"cat_cover:{name}",
                bytes(row["image_data"]),
                row["content_type"] or "image/jpeg",
            )

    logger.info("Image cache warmed up: %d entries", image_cache.size)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    await _warmup_cover_cache()
    yield
    image_cache.clear()
    await close_pool()


app = FastAPI(title="GasGen MiniApp API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "ok"}

app.include_router(categories.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(images.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(generate.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(payments.router, prefix="/api")

# Serve frontend static files (built React app) — MUST be last, catches all unmatched routes
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
