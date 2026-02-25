from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from webapp.db import get_pool

router = APIRouter()

CACHE_HEADER = {"Cache-Control": "public, max-age=86400"}


@router.get("/images/{post_id}/result")
async def get_result_image(post_id: int):
    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT image_data, content_type FROM images WHERE post_id = $1 AND image_type = 'result' LIMIT 1",
        post_id,
    )
    if not row or not row["image_data"]:
        raise HTTPException(status_code=404, detail="Image not found")

    media = row["content_type"] or "image/jpeg"
    return Response(content=bytes(row["image_data"]), media_type=media, headers=CACHE_HEADER)


@router.get("/images/{post_id}/reference/{order}")
async def get_reference_image(post_id: int, order: int):
    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT image_data, content_type FROM images WHERE post_id = $1 AND image_type = 'reference' AND reference_order = $2 LIMIT 1",
        post_id, order,
    )
    if not row or not row["image_data"]:
        raise HTTPException(status_code=404, detail="Reference image not found")

    media = row["content_type"] or "image/jpeg"
    return Response(content=bytes(row["image_data"]), media_type=media, headers=CACHE_HEADER)
