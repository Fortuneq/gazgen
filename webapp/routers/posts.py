from fastapi import APIRouter, Query, HTTPException
from webapp.db import get_pool
from webapp.config import get_category_emoji
from webapp.models import PostOut, PostDetailOut, PaginatedPosts, ImageMeta

router = APIRouter()


@router.get("/posts", response_model=PaginatedPosts)
async def list_posts(
    category: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    pool = get_pool()
    offset = (page - 1) * limit

    if category:
        rows = await pool.fetch(
            """
            SELECT p.id, p.publication_id, p.prompt, p.model_name AS category, p.created_at,
                   EXISTS(SELECT 1 FROM images WHERE post_id = p.id AND image_type = 'result') AS has_result,
                   (SELECT count(*) FROM images WHERE post_id = p.id AND image_type = 'reference') AS ref_count
            FROM posts p
            WHERE p.model_name = $1
            ORDER BY p.id DESC
            LIMIT $2 OFFSET $3
            """,
            category, limit, offset,
        )
        total = await pool.fetchval(
            "SELECT count(*) FROM posts WHERE model_name = $1", category
        )
    else:
        rows = await pool.fetch(
            """
            SELECT p.id, p.publication_id, p.prompt, p.model_name AS category, p.created_at,
                   EXISTS(SELECT 1 FROM images WHERE post_id = p.id AND image_type = 'result') AS has_result,
                   (SELECT count(*) FROM images WHERE post_id = p.id AND image_type = 'reference') AS ref_count
            FROM posts p
            ORDER BY p.id DESC
            LIMIT $1 OFFSET $2
            """,
            limit, offset,
        )
        total = await pool.fetchval("SELECT count(*) FROM posts")

    items = [
        PostOut(
            id=r["id"],
            publication_id=r["publication_id"],
            prompt=r["prompt"],
            category=r["category"] or "Unknown",
            category_emoji=get_category_emoji(r["category"]),
            created_at=r["created_at"].isoformat() if r["created_at"] else "",
            has_result_image=r["has_result"],
            reference_count=r["ref_count"],
        )
        for r in rows
    ]

    return PaginatedPosts(
        items=items,
        total=total,
        page=page,
        limit=limit,
        has_more=(page * limit) < total,
    )


@router.get("/posts/{post_id}", response_model=PostDetailOut)
async def get_post(post_id: int):
    pool = get_pool()
    row = await pool.fetchrow(
        """
        SELECT p.id, p.publication_id, p.prompt, p.model_name AS category, p.created_at,
               EXISTS(SELECT 1 FROM images WHERE post_id = p.id AND image_type = 'result') AS has_result,
               (SELECT count(*) FROM images WHERE post_id = p.id AND image_type = 'reference') AS ref_count
        FROM posts p WHERE p.id = $1
        """,
        post_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Post not found")

    refs = await pool.fetch(
        """
        SELECT reference_order, width, height
        FROM images
        WHERE post_id = $1 AND image_type = 'reference'
        ORDER BY reference_order
        """,
        post_id,
    )

    return PostDetailOut(
        id=row["id"],
        publication_id=row["publication_id"],
        prompt=row["prompt"],
        category=row["category"] or "Unknown",
        category_emoji=get_category_emoji(row["category"]),
        created_at=row["created_at"].isoformat() if row["created_at"] else "",
        has_result_image=row["has_result"],
        reference_count=row["ref_count"],
        references=[
            ImageMeta(
                order=ref["reference_order"] or 0,
                width=ref["width"],
                height=ref["height"],
            )
            for ref in refs
        ],
    )
