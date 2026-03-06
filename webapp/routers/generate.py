import logging

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from webapp.db import get_pool
from webapp.models import (
    GenerateRequest,
    GenerateResponse,
    GenerateStatusOut,
    DirectGenerateRequest,
    UploadReferenceResponse,
)
from webapp.services.generation import (
    get_model_id,
    upload_image_to_imgbb,
    create_generation_task,
    create_generation_task_v2,
    poll_task_status,
)
from webapp.services.ai_agent import generate_adapted_prompt
from webapp.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


async def _get_model_cost(pool, model_key: str) -> int:
    """Get credit cost for a model from DB, default 1."""
    row = await pool.fetchrow(
        "SELECT credit_cost FROM model_prices WHERE model_key = $1", model_key
    )
    return row["credit_cost"] if row else 1


async def _check_and_deduct(pool, telegram_id: int, model_key: str, task_id: str):
    """Check user has enough credits for model, deduct and log transaction."""
    cost = await _get_model_cost(pool, model_key)
    credit_row = await pool.fetchrow(
        "SELECT photo_credits FROM users WHERE telegram_id = $1", telegram_id
    )
    if not credit_row or credit_row["photo_credits"] < cost:
        raise HTTPException(
            status_code=402,
            detail=f"Недостаточно кредитов (нужно {cost})",
        )
    await pool.execute(
        "UPDATE users SET photo_credits = photo_credits - $1 "
        "WHERE telegram_id = $2 AND photo_credits >= $1",
        cost, telegram_id,
    )
    await pool.execute(
        "INSERT INTO credit_transactions (telegram_id, credit_type, amount, reason, task_id) "
        "VALUES ($1, 'photo', $2, 'generation', $3)",
        telegram_id, -cost, task_id,
    )


@router.post("/generate", response_model=GenerateResponse)
async def start_generation(req: GenerateRequest, user: dict = Depends(get_current_user)):
    pool = get_pool()
    telegram_id = user["id"]

    # Resolve model key
    model_key = req.model or "nano_banana"

    # Pre-check credits before heavy work
    cost = await _get_model_cost(pool, model_key)
    credit_row = await pool.fetchrow(
        "SELECT photo_credits FROM users WHERE telegram_id = $1", telegram_id
    )
    if not credit_row or credit_row["photo_credits"] < cost:
        raise HTTPException(status_code=402, detail=f"Недостаточно кредитов (нужно {cost})")

    row = await pool.fetchrow(
        "SELECT id, prompt, model_name FROM posts WHERE id = $1", req.post_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Post not found")

    original_prompt = row["prompt"] or ""
    category = row["model_name"] or "Unknown"

    # Determine prompt
    if req.prompt_mode == "custom" and req.custom_prompt:
        prompt = req.custom_prompt
    elif req.prompt_mode == "adapted" and req.custom_prompt:
        prompt = await generate_adapted_prompt(req.custom_prompt, original_prompt, category)
    else:
        prompt = original_prompt

    if not prompt:
        raise HTTPException(status_code=400, detail="No prompt available")

    # Upload reference images to imgbb
    reference_urls: list[str] = []
    if req.use_references:
        ref_rows = await pool.fetch(
            "SELECT image_data FROM images WHERE post_id = $1 AND image_type = 'reference' ORDER BY reference_order",
            req.post_id,
        )
        for ref_row in ref_rows:
            url = await upload_image_to_imgbb(bytes(ref_row["image_data"]))
            if url:
                reference_urls.append(url)

    model_id = get_model_id(category)
    if req.model:
        model_id = req.model
    task_id = await create_generation_task(
        model_id, prompt, reference_urls, req.aspect_ratio
    )
    logger.info("Created generation task %s for model %s", task_id, model_id)

    await _check_and_deduct(pool, telegram_id, model_key, task_id)

    cost = await _get_model_cost(pool, model_key)
    await pool.execute(
        "INSERT INTO user_generations (telegram_id, task_id, prompt, model, aspect_ratio, cost, status) "
        "VALUES ($1, $2, $3, $4, $5, $6, 'pending') ON CONFLICT (task_id) DO NOTHING",
        telegram_id, task_id, prompt, model_key, req.aspect_ratio, cost,
    )

    return GenerateResponse(task_id=task_id)


@router.post("/generate/direct", response_model=GenerateResponse)
async def start_direct_generation(req: DirectGenerateRequest, user: dict = Depends(get_current_user)):
    pool = get_pool()
    telegram_id = user["id"]

    # Pre-check credits
    cost = await _get_model_cost(pool, req.model)
    credit_row = await pool.fetchrow(
        "SELECT photo_credits FROM users WHERE telegram_id = $1", telegram_id
    )
    if not credit_row or credit_row["photo_credits"] < cost:
        raise HTTPException(status_code=402, detail=f"Недостаточно кредитов (нужно {cost})")

    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")

    try:
        task_id = await create_generation_task_v2(
            req.model, req.prompt, req.reference_urls, req.aspect_ratio
        )
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    logger.info("Created direct generation task %s for model key %s", task_id, req.model)

    await _check_and_deduct(pool, telegram_id, req.model, task_id)

    cost = await _get_model_cost(pool, req.model)
    await pool.execute(
        "INSERT INTO user_generations (telegram_id, task_id, prompt, model, aspect_ratio, cost, status) "
        "VALUES ($1, $2, $3, $4, $5, $6, 'pending') ON CONFLICT (task_id) DO NOTHING",
        telegram_id, task_id, req.prompt.strip(), req.model, req.aspect_ratio, cost,
    )

    return GenerateResponse(task_id=task_id)


@router.post("/upload-reference", response_model=UploadReferenceResponse)
async def upload_reference(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    url = await upload_image_to_imgbb(contents)
    if not url:
        raise HTTPException(status_code=500, detail="Failed to upload image")

    return UploadReferenceResponse(url=url)


@router.get("/generate/{task_id}/status", response_model=GenerateStatusOut)
async def generation_status(task_id: str):
    pool = get_pool()
    try:
        result = await poll_task_status(task_id)
    except RuntimeError as e:
        await pool.execute(
            "UPDATE user_generations SET status = 'failed' WHERE task_id = $1 AND status != 'failed'",
            task_id,
        )
        return GenerateStatusOut(task_id=task_id, status="failed", error=str(e))

    if result["status"] in ("success", "completed"):
        await pool.execute(
            "UPDATE user_generations SET status = 'success', result_url = $1 "
            "WHERE task_id = $2 AND status != 'success'",
            result.get("result_url"), task_id,
        )
    elif result["status"] == "failed":
        await pool.execute(
            "UPDATE user_generations SET status = 'failed' WHERE task_id = $1 AND status != 'failed'",
            task_id,
        )

    return GenerateStatusOut(
        task_id=task_id,
        status=result["status"],
        result_url=result.get("result_url"),
        error=result.get("error"),
    )
