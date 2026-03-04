import io

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from PIL import Image
from webapp.db import get_pool
from webapp.image_cache import image_cache

router = APIRouter()

CACHE_HEADER = {"Cache-Control": "public, max-age=86400"}

THUMB_MAX_WIDTH = 400
THUMB_QUALITY = 75


def make_thumbnail(data: bytes, max_width: int = THUMB_MAX_WIDTH, quality: int = THUMB_QUALITY) -> bytes:
    """Resize image to max_width keeping aspect ratio, return JPEG bytes."""
    img = Image.open(io.BytesIO(data))
    if img.width > max_width:
        ratio = max_width / img.width
        new_size = (max_width, int(img.height * ratio))
        img = img.resize(new_size, Image.LANCZOS)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()


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


@router.get("/images/{post_id}/result/thumb")
async def get_result_thumb(post_id: int):
    cache_key = f"thumb:{post_id}"
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

    thumb_data = make_thumbnail(bytes(row["image_data"]))
    image_cache.put(cache_key, thumb_data, "image/jpeg")
    return Response(content=thumb_data, media_type="image/jpeg", headers=CACHE_HEADER)


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
