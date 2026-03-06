from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from webapp.db import get_pool
from webapp.models import TagOut
from webapp.image_cache import image_cache
from webapp.routers.images import make_thumbnail

router = APIRouter()

# Hardcoded fallbacks — used only if tag_settings table doesn't exist yet
_FALLBACK_HIDDEN = {"male", "female"}
_FALLBACK_DISPLAY = {
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


async def _get_tag_settings(pool) -> dict:
    """Load tag_settings from DB; returns {name: {display_name, emoji, hidden, sort_order}}."""
    try:
        rows = await pool.fetch("SELECT name, display_name, emoji, hidden, sort_order FROM tag_settings")
        return {r["name"]: dict(r) for r in rows}
    except Exception:
        # Table doesn't exist yet — use fallback
        return {}


@router.get("/tags", response_model=list[TagOut])
async def list_tags():
    pool = get_pool()
    settings = await _get_tag_settings(pool)

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

        if settings:
            info = settings.get(tag_name)
            if info and info.get("hidden"):
                continue
            display_name = info["display_name"] if info else tag_name.capitalize()
            emoji = info["emoji"] if info else "📁"
            sort_order = info["sort_order"] if info else 999
        else:
            if tag_name in _FALLBACK_HIDDEN:
                continue
            fb = _FALLBACK_DISPLAY.get(tag_name, {"display_name": tag_name.capitalize(), "emoji": "📁"})
            display_name = fb["display_name"]
            emoji = fb["emoji"]
            sort_order = 999

        result.append(TagOut(
            name=tag_name,
            display_name=display_name,
            emoji=emoji,
            post_count=r["cnt"],
        ))

    if settings:
        order_map = {s["name"]: s.get("sort_order", 999) for s in settings.values()}
        result.sort(key=lambda t: order_map.get(t.name, 999))

    return result


@router.get("/tags/{tag_name}/cover")
async def tag_cover(tag_name: str):
    cache_key = f"tag_cover:{tag_name}"
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
        JOIN posts p ON p.id = i.post_id
        WHERE $1 = ANY(p.tags) AND i.image_type = 'result'
        ORDER BY p.id DESC
        LIMIT 1
        """,
        tag_name,
    )
    if not row:
        raise HTTPException(status_code=404, detail="No cover for tag")

    thumb = make_thumbnail(bytes(row["image_data"]))
    image_cache.put(cache_key, thumb, "image/jpeg")
    return Response(
        content=thumb, media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )
