import logging

from fastapi import APIRouter, HTTPException
from webapp.db import get_pool
from webapp.models import GenerateRequest, GenerateResponse, GenerateStatusOut
from webapp.services.generation import (
    get_model_id,
    upload_image_to_imgbb,
    create_generation_task,
    poll_task_status,
)
from webapp.services.ai_agent import generate_adapted_prompt

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/generate", response_model=GenerateResponse)
async def start_generation(req: GenerateRequest):
    pool = get_pool()

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
    task_id = await create_generation_task(
        model_id, prompt, reference_urls, req.aspect_ratio
    )
    logger.info("Created generation task %s for model %s", task_id, model_id)

    return GenerateResponse(task_id=task_id)


@router.get("/generate/{task_id}/status", response_model=GenerateStatusOut)
async def generation_status(task_id: str):
    try:
        result = await poll_task_status(task_id)
    except RuntimeError as e:
        return GenerateStatusOut(task_id=task_id, status="failed", error=str(e))

    return GenerateStatusOut(
        task_id=task_id,
        status=result["status"],
        result_url=result.get("result_url"),
        error=result.get("error"),
    )
