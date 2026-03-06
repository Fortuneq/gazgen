from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from webapp.auth import get_admin_user
from webapp.db import get_pool
from webapp.models import (
    AdminPostOut, PaginatedAdminPosts,
    AdminCategoryOut, AdminUserOut, PaginatedAdminUsers,
    CreditAdjust, StatsOverview, PopularModelOut, DailyActiveOut, PaymentStatsOut,
    AdminTagOut,
)

router = APIRouter(prefix="/admin", tags=["admin"])


# --------------- check ---------------

@router.get("/check")
async def admin_check(user: dict = Depends(get_admin_user)):
    return {"is_admin": True}


# --------------- posts ---------------

@router.get("/posts", response_model=PaginatedAdminPosts)
async def admin_get_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_admin_user),
):
    pool = get_pool()
    offset = (page - 1) * limit
    conditions = []
    args = []
    idx = 1

    if category:
        conditions.append(f"p.model_name = ${idx}")
        args.append(category)
        idx += 1
    if search:
        conditions.append(f"p.prompt ILIKE ${idx}")
        args.append(f"%{search}%")
        idx += 1

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    total = await pool.fetchval(
        f"SELECT COUNT(*) FROM posts p {where}", *args
    )

    rows = await pool.fetch(
        f"""
        SELECT p.id, p.publication_id, p.prompt, p.model_name, p.created_at,
               EXISTS(SELECT 1 FROM images i WHERE i.post_id = p.id AND i.image_type = 'result') AS has_result_image,
               (SELECT COUNT(*) FROM images i WHERE i.post_id = p.id AND i.image_type = 'reference') AS reference_count
        FROM posts p {where}
        ORDER BY p.id DESC
        LIMIT ${idx} OFFSET ${idx + 1}
        """,
        *args, limit, offset,
    )

    items = [
        AdminPostOut(
            id=r["id"],
            publication_id=r["publication_id"],
            prompt=r["prompt"],
            model_name=r["model_name"],
            created_at=str(r["created_at"]),
            has_result_image=r["has_result_image"],
            reference_count=r["reference_count"],
        )
        for r in rows
    ]
    return PaginatedAdminPosts(items=items, total=total, page=page, limit=limit)


@router.delete("/posts/{post_id}")
async def admin_delete_post(post_id: int, user: dict = Depends(get_admin_user)):
    pool = get_pool()
    result = await pool.execute("DELETE FROM posts WHERE id = $1", post_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Post not found")
    return {"ok": True}


@router.patch("/posts/{post_id}")
async def admin_update_post(
    post_id: int,
    category: str = Query(...),
    user: dict = Depends(get_admin_user),
):
    pool = get_pool()
    result = await pool.execute(
        "UPDATE posts SET model_name = $1 WHERE id = $2", category, post_id
    )
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Post not found")
    return {"ok": True}


# --------------- categories ---------------

@router.get("/categories", response_model=list[AdminCategoryOut])
async def admin_get_categories(user: dict = Depends(get_admin_user)):
    pool = get_pool()
    rows = await pool.fetch("SELECT id, name, emoji, post_count FROM categories ORDER BY post_count DESC")
    return [
        AdminCategoryOut(id=r["id"], name=r["name"], emoji=r["emoji"], post_count=r["post_count"])
        for r in rows
    ]


@router.post("/categories", response_model=AdminCategoryOut)
async def admin_create_category(
    name: str = Query(...),
    emoji: str = Query(""),
    user: dict = Depends(get_admin_user),
):
    pool = get_pool()
    row = await pool.fetchrow(
        "INSERT INTO categories (name, emoji, post_count) VALUES ($1, $2, 0) RETURNING id, name, emoji, post_count",
        name, emoji,
    )
    return AdminCategoryOut(id=row["id"], name=row["name"], emoji=row["emoji"], post_count=row["post_count"])


@router.patch("/categories/{cat_id}")
async def admin_update_category(
    cat_id: int,
    name: Optional[str] = Query(None),
    emoji: Optional[str] = Query(None),
    user: dict = Depends(get_admin_user),
):
    pool = get_pool()
    sets = []
    args = []
    idx = 1
    if name is not None:
        sets.append(f"name = ${idx}")
        args.append(name)
        idx += 1
    if emoji is not None:
        sets.append(f"emoji = ${idx}")
        args.append(emoji)
        idx += 1
    if not sets:
        raise HTTPException(status_code=400, detail="Nothing to update")
    args.append(cat_id)
    result = await pool.execute(
        f"UPDATE categories SET {', '.join(sets)} WHERE id = ${idx}", *args
    )
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Category not found")
    return {"ok": True}


@router.delete("/categories/{cat_id}")
async def admin_delete_category(cat_id: int, user: dict = Depends(get_admin_user)):
    pool = get_pool()
    result = await pool.execute("DELETE FROM categories WHERE id = $1", cat_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Category not found")
    return {"ok": True}


# --------------- users ---------------

@router.get("/users", response_model=PaginatedAdminUsers)
async def admin_get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    user: dict = Depends(get_admin_user),
):
    pool = get_pool()
    offset = (page - 1) * limit
    conditions = []
    args = []
    idx = 1

    if search:
        conditions.append(
            f"(u.first_name ILIKE ${idx} OR u.username ILIKE ${idx} OR CAST(u.telegram_id AS TEXT) LIKE ${idx})"
        )
        args.append(f"%{search}%")
        idx += 1

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    total = await pool.fetchval(f"SELECT COUNT(*) FROM users u {where}", *args)

    rows = await pool.fetch(
        f"""
        SELECT u.id, u.telegram_id, u.username, u.first_name, u.last_name,
               u.photo_credits, u.video_credits, u.created_at, u.last_active_at
        FROM users u {where}
        ORDER BY u.last_active_at DESC NULLS LAST
        LIMIT ${idx} OFFSET ${idx + 1}
        """,
        *args, limit, offset,
    )

    items = [
        AdminUserOut(
            id=r["id"],
            telegram_id=r["telegram_id"],
            username=r["username"],
            first_name=r["first_name"],
            last_name=r["last_name"],
            photo_credits=r["photo_credits"],
            video_credits=r["video_credits"],
            created_at=str(r["created_at"]),
            last_active_at=str(r["last_active_at"]) if r["last_active_at"] else None,
        )
        for r in rows
    ]
    return PaginatedAdminUsers(items=items, total=total, page=page, limit=limit)


@router.post("/users/{telegram_id}/credits")
async def admin_adjust_credits(
    telegram_id: int,
    body: CreditAdjust,
    user: dict = Depends(get_admin_user),
):
    pool = get_pool()
    row = await pool.fetchrow("SELECT photo_credits FROM users WHERE telegram_id = $1", telegram_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    await pool.execute(
        "UPDATE users SET photo_credits = photo_credits + $1 WHERE telegram_id = $2",
        body.amount, telegram_id,
    )
    await pool.execute(
        """
        INSERT INTO credit_transactions (telegram_id, credit_type, amount, reason)
        VALUES ($1, 'photo', $2, $3)
        """,
        telegram_id, body.amount, body.reason,
    )

    new_balance = await pool.fetchval(
        "SELECT photo_credits FROM users WHERE telegram_id = $1", telegram_id
    )
    return {"ok": True, "new_balance": new_balance}


# --------------- stats ---------------

@router.get("/stats/overview", response_model=StatsOverview)
async def admin_stats_overview(user: dict = Depends(get_admin_user)):
    pool = get_pool()
    total_users = await pool.fetchval("SELECT COUNT(*) FROM users")
    total_posts = await pool.fetchval("SELECT COUNT(*) FROM posts")
    total_generations = await pool.fetchval("SELECT COUNT(*) FROM user_generations")
    total_revenue = await pool.fetchval(
        "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid'"
    ) or 0
    dau = await pool.fetchval(
        "SELECT COUNT(DISTINCT telegram_id) FROM users WHERE last_active_at >= NOW() - INTERVAL '1 day'"
    )
    return StatsOverview(
        total_users=total_users,
        total_posts=total_posts,
        total_generations=total_generations,
        total_revenue=float(total_revenue),
        dau=dau,
    )


@router.get("/stats/popular-models", response_model=list[PopularModelOut])
async def admin_popular_models(
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(get_admin_user),
):
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT model, COUNT(*) AS cnt
        FROM user_generations
        WHERE created_at >= NOW() - make_interval(days => $1)
        GROUP BY model
        ORDER BY cnt DESC
        LIMIT 20
        """,
        days,
    )
    return [PopularModelOut(model=r["model"], count=r["cnt"]) for r in rows]


@router.get("/stats/daily-active", response_model=list[DailyActiveOut])
async def admin_daily_active(
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(get_admin_user),
):
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT d.date,
               COALESCE(u.cnt, 0) AS users,
               COALESCE(g.cnt, 0) AS generations
        FROM generate_series(
            (CURRENT_DATE - make_interval(days => $1))::date,
            CURRENT_DATE,
            '1 day'
        ) AS d(date)
        LEFT JOIN (
            SELECT last_active_at::date AS date, COUNT(DISTINCT telegram_id) AS cnt
            FROM users
            WHERE last_active_at >= NOW() - make_interval(days => $1)
            GROUP BY last_active_at::date
        ) u ON u.date = d.date
        LEFT JOIN (
            SELECT created_at::date AS date, COUNT(*) AS cnt
            FROM user_generations
            WHERE created_at >= NOW() - make_interval(days => $1)
            GROUP BY created_at::date
        ) g ON g.date = d.date
        ORDER BY d.date
        """,
        days,
    )
    return [
        DailyActiveOut(date=str(r["date"]), users=r["users"], generations=r["generations"])
        for r in rows
    ]


@router.get("/stats/payments", response_model=list[PaymentStatsOut])
async def admin_payment_stats(
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(get_admin_user),
):
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT paid_at::date AS date, SUM(amount) AS amount, COUNT(*) AS cnt
        FROM payments
        WHERE status = 'paid' AND paid_at >= NOW() - make_interval(days => $1)
        GROUP BY paid_at::date
        ORDER BY date
        """,
        days,
    )
    return [
        PaymentStatsOut(date=str(r["date"]), amount=float(r["amount"]), count=r["cnt"])
        for r in rows
    ]


# --------------- tags ---------------

@router.get("/tags", response_model=list[AdminTagOut])
async def admin_get_tags(user: dict = Depends(get_admin_user)):
    pool = get_pool()

    # Get post counts per tag
    try:
        tag_counts = await pool.fetch(
            """
            SELECT unnest(tags) AS tag, COUNT(*) AS cnt
            FROM posts
            WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
            GROUP BY tag
            """
        )
    except Exception:
        tag_counts = []
    count_map = {r["tag"]: r["cnt"] for r in tag_counts}

    rows = await pool.fetch("SELECT id, name, display_name, emoji, hidden, sort_order FROM tag_settings ORDER BY sort_order, name")
    return [
        AdminTagOut(
            id=r["id"], name=r["name"], display_name=r["display_name"],
            emoji=r["emoji"] or "", hidden=r["hidden"], sort_order=r["sort_order"],
            post_count=count_map.get(r["name"], 0),
        )
        for r in rows
    ]


@router.post("/tags", response_model=AdminTagOut)
async def admin_create_tag(
    name: str = Query(...),
    display_name: str = Query(...),
    emoji: str = Query(""),
    hidden: bool = Query(False),
    sort_order: int = Query(0),
    user: dict = Depends(get_admin_user),
):
    pool = get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO tag_settings (name, display_name, emoji, hidden, sort_order)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, display_name, emoji, hidden, sort_order
        """,
        name, display_name, emoji, hidden, sort_order,
    )
    return AdminTagOut(
        id=row["id"], name=row["name"], display_name=row["display_name"],
        emoji=row["emoji"] or "", hidden=row["hidden"], sort_order=row["sort_order"],
        post_count=0,
    )


@router.patch("/tags/{tag_id}")
async def admin_update_tag(
    tag_id: int,
    name: Optional[str] = Query(None),
    display_name: Optional[str] = Query(None),
    emoji: Optional[str] = Query(None),
    hidden: Optional[bool] = Query(None),
    sort_order: Optional[int] = Query(None),
    user: dict = Depends(get_admin_user),
):
    pool = get_pool()
    sets = []
    args = []
    idx = 1
    for field, value in [("name", name), ("display_name", display_name), ("emoji", emoji)]:
        if value is not None:
            sets.append(f"{field} = ${idx}")
            args.append(value)
            idx += 1
    if hidden is not None:
        sets.append(f"hidden = ${idx}")
        args.append(hidden)
        idx += 1
    if sort_order is not None:
        sets.append(f"sort_order = ${idx}")
        args.append(sort_order)
        idx += 1
    if not sets:
        raise HTTPException(status_code=400, detail="Nothing to update")
    args.append(tag_id)
    result = await pool.execute(
        f"UPDATE tag_settings SET {', '.join(sets)} WHERE id = ${idx}", *args
    )
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"ok": True}


@router.delete("/tags/{tag_id}")
async def admin_delete_tag(tag_id: int, user: dict = Depends(get_admin_user)):
    pool = get_pool()
    result = await pool.execute("DELETE FROM tag_settings WHERE id = $1", tag_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"ok": True}
