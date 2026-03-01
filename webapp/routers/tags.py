from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from webapp.db import get_pool
from webapp.models import TagOut

router = APIRouter()

HIDDEN_TAGS = {"male", "female"}

TAG_DISPLAY = {
    "couple": {"display_name": "Пары", "emoji": "💑"},
    "group": {"display_name": "Группа", "emoji": "👥"},
    "landscape": {"display_name": "Пейзажи", "emoji": "🏞"},
    "object": {"display_name": "Объекты", "emoji": "🎁"},
    "animal": {"display_name": "Животные", "emoji": "🐾"},
    "anime": {"display_name": "Аниме", "emoji": "🎌"},
    "abstract": {"display_name": "Абстракция", "emoji": "🎨"},
    "fashion": {"display_name": "Мода", "emoji": "👗"},
    "portrait": {"display_name": "Портреты", "emoji": "🖼"},
    "fullbody": {"display_name": "В полный рост", "emoji": "🧍"},
}


@router.get("/tags", response_model=list[TagOut])
async def list_tags():
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT unnest(tags) AS tag, COUNT(*) AS cnt
        FROM posts
        WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
        GROUP BY tag
        ORDER BY cnt DESC
        """
    )
    result = []
    for r in rows:
        tag_name = r["tag"]
        if tag_name in HIDDEN_TAGS:
            continue
        info = TAG_DISPLAY.get(tag_name, {"display_name": tag_name.capitalize(), "emoji": "📁"})
        result.append(TagOut(
            name=tag_name,
            display_name=info["display_name"],
            emoji=info["emoji"],
            post_count=r["cnt"],
        ))
    return result


@router.get("/tags/{tag_name}/cover")
async def tag_cover(tag_name: str):
    pool = get_pool()
    row = await pool.fetchrow(
        """
        SELECT i.image_data, i.content_type
        FROM images i
        JOIN posts p ON p.id = i.post_id
        WHERE $1 = ANY(p.tags) AND i.image_type = 'result'
        ORDER BY p.id DESC
        LIMIT 1
        """,
        tag_name,
    )
    if not row:
        raise HTTPException(status_code=404, detail="No cover for tag")
    return Response(
        content=bytes(row["image_data"]),
        media_type=row["content_type"] or "image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )
