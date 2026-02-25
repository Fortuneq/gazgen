from fastapi import APIRouter
from webapp.db import get_pool
from webapp.config import get_category_emoji
from webapp.models import SearchRequest, SearchResultOut
from webapp.services.embedding import encode_query

router = APIRouter()


@router.post("/search", response_model=list[SearchResultOut])
async def search_posts(req: SearchRequest):
    embedding = encode_query(req.query)
    pool = get_pool()

    rows = await pool.fetch(
        """
        SELECT
            p.id, p.publication_id, p.prompt, p.model_name AS category, p.created_at,
            1 - (p.prompt_embedding <=> $1::vector) AS similarity,
            EXISTS(SELECT 1 FROM images WHERE post_id = p.id AND image_type = 'result') AS has_result,
            (SELECT count(*) FROM images WHERE post_id = p.id AND image_type = 'reference') AS ref_count
        FROM posts p
        WHERE p.prompt_embedding IS NOT NULL
        ORDER BY p.prompt_embedding <=> $1::vector
        LIMIT $2
        """,
        str(embedding), req.limit,
    )

    return [
        SearchResultOut(
            id=r["id"],
            publication_id=r["publication_id"],
            prompt=r["prompt"],
            category=r["category"] or "Unknown",
            category_emoji=get_category_emoji(r["category"]),
            created_at=r["created_at"].isoformat() if r["created_at"] else "",
            has_result_image=r["has_result"],
            reference_count=r["ref_count"],
            similarity=round(float(r["similarity"]), 4),
        )
        for r in rows
    ]
