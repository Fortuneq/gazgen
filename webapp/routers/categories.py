from fastapi import APIRouter
from webapp.db import get_pool
from webapp.config import get_category_emoji
from webapp.models import CategoryOut

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
