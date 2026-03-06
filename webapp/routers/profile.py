from fastapi import APIRouter, Depends, Query, HTTPException

from webapp.auth import get_current_user
from webapp.db import get_pool
from webapp.models import ProfileOut, PaginatedGenerations, UserGenerationOut

router = APIRouter()


@router.get("/profile", response_model=ProfileOut)
async def get_profile(user: dict = Depends(get_current_user)):
    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT telegram_id, first_name, username, photo_credits, video_credits "
        "FROM users WHERE telegram_id = $1",
        user["id"],
    )
    return ProfileOut(
        telegram_id=row["telegram_id"],
        first_name=row["first_name"],
        username=row["username"],
        photo_credits=row["photo_credits"],
        video_credits=row["video_credits"],
    )


@router.get("/profile/generations", response_model=PaginatedGenerations)
async def get_my_generations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    pool = get_pool()
    telegram_id = user["id"]
    offset = (page - 1) * limit

    total_row = await pool.fetchrow(
        "SELECT COUNT(*) as cnt FROM user_generations "
        "WHERE telegram_id = $1 AND status = 'success'",
        telegram_id,
    )
    total = total_row["cnt"]

    rows = await pool.fetch(
        "SELECT id, task_id, prompt, model, aspect_ratio, result_url, reference_urls, cost, created_at "
        "FROM user_generations "
        "WHERE telegram_id = $1 AND status = 'success' "
        "ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        telegram_id, limit, offset,
    )

    items = [
        UserGenerationOut(
            id=r["id"],
            task_id=r["task_id"],
            prompt=r["prompt"],
            model=r["model"],
            aspect_ratio=r["aspect_ratio"],
            result_url=r["result_url"],
            reference_urls=list(r["reference_urls"]) if r["reference_urls"] else None,
            cost=r["cost"],
            created_at=r["created_at"].isoformat() if r["created_at"] else "",
        )
        for r in rows
    ]

    return PaginatedGenerations(
        items=items,
        total=total,
        page=page,
        limit=limit,
        has_more=(offset + limit) < total,
    )


@router.get("/profile/generations/{task_id}", response_model=UserGenerationOut)
async def get_generation_by_task(task_id: str, user: dict = Depends(get_current_user)):
    pool = get_pool()
    r = await pool.fetchrow(
        "SELECT id, task_id, prompt, model, aspect_ratio, result_url, reference_urls, cost, created_at "
        "FROM user_generations WHERE task_id = $1 AND telegram_id = $2",
        task_id, user["id"],
    )
    if not r:
        raise HTTPException(status_code=404, detail="Generation not found")
    return UserGenerationOut(
        id=r["id"],
        task_id=r["task_id"],
        prompt=r["prompt"],
        model=r["model"],
        aspect_ratio=r["aspect_ratio"],
        result_url=r["result_url"],
        reference_urls=list(r["reference_urls"]) if r["reference_urls"] else None,
        cost=r["cost"],
        created_at=r["created_at"].isoformat() if r["created_at"] else "",
    )
