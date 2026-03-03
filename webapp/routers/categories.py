from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from webapp.db import get_pool
from webapp.config import get_category_emoji
from webapp.models import CategoryOut
from webapp.image_cache import image_cache

router = APIRouter()


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories():
    pool = get_pool()
    rows = await pool.fetch(
        "SELECT name, post_count FROM categories WHERE post_count > 0 ORDER BY post_count DESC"
    )
    return [
        CategoryOut(
            name=row["name"],
            emoji=get_category_emoji(row["name"]),
            post_count=row["post_count"],
        )
        for row in rows
    ]


@router.get("/categories/{name}/cover")
async def category_cover(name: str):
    cache_key = f"cat_cover:{name}"
    cached = image_cache.get(cache_key)
    if cached:
        return Response(
            content=cached[0], media_type=cached[1],
            headers={"Cache-Control": "public, max-age=86400"},
        )

    pool = get_pool()
    row = await pool.fetchrow(
        """
        SELECT i.image_data, i.content_type
        FROM images i
        JOIN posts p ON i.post_id = p.id
        WHERE p.model_name = $1 AND i.image_type = 'result'
        ORDER BY p.id DESC
        LIMIT 1
        """,
        name,
    )
    if not row or not row["image_data"]:
        raise HTTPException(status_code=404, detail="Cover not found")

    data = bytes(row["image_data"])
    media = row["content_type"] or "image/jpeg"
    image_cache.put(cache_key, data, media)
    return Response(
        content=data, media_type=media,
        headers={"Cache-Control": "public, max-age=86400"},
    )
