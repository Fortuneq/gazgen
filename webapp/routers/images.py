from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from webapp.db import get_pool
from webapp.image_cache import image_cache

router = APIRouter()

CACHE_HEADER = {"Cache-Control": "public, max-age=86400"}


@router.get("/images/{post_id}/result")
async def get_result_image(post_id: int):
    cache_key = f"result:{post_id}"
    cached = image_cache.get(cache_key)
    if cached:
        return Response(content=cached[0], media_type=cached[1], headers=CACHE_HEADER)

    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT image_data, content_type FROM images WHERE post_id = $1 AND image_type = 'result' LIMIT 1",
        post_id,
    )
    if not row or not row["image_data"]:
        raise HTTPException(status_code=404, detail="Image not found")

    data = bytes(row["image_data"])
    media = row["content_type"] or "image/jpeg"
    image_cache.put(cache_key, data, media)
    return Response(content=data, media_type=media, headers=CACHE_HEADER)


@router.get("/images/{post_id}/reference/{order}")
async def get_reference_image(post_id: int, order: int):
    cache_key = f"ref:{post_id}:{order}"
    cached = image_cache.get(cache_key)
    if cached:
        return Response(content=cached[0], media_type=cached[1], headers=CACHE_HEADER)

    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT image_data, content_type FROM images WHERE post_id = $1 AND image_type = 'reference' AND reference_order = $2 LIMIT 1",
        post_id, order,
    )
    if not row or not row["image_data"]:
        raise HTTPException(status_code=404, detail="Reference image not found")

    data = bytes(row["image_data"])
    media = row["content_type"] or "image/jpeg"
    image_cache.put(cache_key, data, media)
    return Response(content=data, media_type=media, headers=CACHE_HEADER)
