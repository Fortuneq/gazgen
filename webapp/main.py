import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from webapp.db import init_pool, close_pool, get_pool
from webapp.image_cache import image_cache
from webapp.routers import categories, posts, images, search, generate, tags, profile, payments, pally, auth, admin
from webapp.routers.images import make_thumbnail

logger = logging.getLogger(__name__)


async def _warmup_cover_cache():
    """Pre-generate thumbnails for feed images and cover images at startup."""
    pool = get_pool()

    # Tag covers (thumbnail)
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
            raw = bytes(row["image_data"])
            image_cache.put(
                f"tag_cover:{tag_name}",
                make_thumbnail(raw),
                "image/jpeg",
            )

    # Category covers (thumbnail)
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
            raw = bytes(row["image_data"])
            image_cache.put(
                f"cat_cover:{name}",
                make_thumbnail(raw),
                "image/jpeg",
            )

    # Pre-generate thumbnails for latest 50 posts (first pages of feed)
    img_rows = await pool.fetch(
        """
        SELECT i.post_id, i.image_data
        FROM images i
        WHERE i.image_type = 'result'
        ORDER BY i.post_id DESC LIMIT 50
        """
    )
    for ir in img_rows:
        if ir["image_data"]:
            raw = bytes(ir["image_data"])
            image_cache.put(
                f"thumb:{ir['post_id']}",
                make_thumbnail(raw),
                "image/jpeg",
            )

    print(f"[warmup] Image cache warmed up: {image_cache.size} entries")


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
app.include_router(pally.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

# Serve frontend static files (built React app) — MUST be last, catches all unmatched routes
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
