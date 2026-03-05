import hashlib
import logging
import uuid

import httpx
from fastapi import APIRouter, HTTPException, Depends, Request

from webapp.auth import get_current_user
from webapp.config import PALLY_API_TOKEN, PALLY_SHOP_ID
from webapp.db import get_pool
from webapp.models import CreatePaymentRequest, CreatePaymentResponse, PaymentStatusOut

router = APIRouter()
logger = logging.getLogger(__name__)

PALLY_API = "https://pal24.pro/api/v1"


@router.post("/payments/pally/create", response_model=CreatePaymentResponse)
async def create_pally_payment(req: CreatePaymentRequest, user: dict = Depends(get_current_user)):
    telegram_id = user["id"]
    order_id = f"pally_{telegram_id}_{uuid.uuid4().hex[:12]}"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{PALLY_API}/bill/create",
            headers={"Authorization": f"Bearer {PALLY_API_TOKEN}"},
            data={
                "amount": str(req.amount),
                "shop_id": PALLY_SHOP_ID,
                "order_id": order_id,
                "description": f"Photix: {req.product_name}",
                "type": "normal",
                "currency_in": "RUB",
                "custom": str(telegram_id),
                "name": req.product_name,
                "payer_pays_commission": "0",
            },
        )

    if resp.status_code != 200:
        logger.error("Pally error %s: %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="Payment service error")

    data = resp.json()
    if data.get("success") not in (True, "true"):
        logger.error("Pally create failed: %s", data)
        raise HTTPException(status_code=502, detail="Payment creation failed")

    payment_url = data.get("link_page_url") or data.get("link_url", "")
    bill_id = data.get("bill_id", "")

    if not payment_url:
        logger.error("Pally no payment URL: %s", data)
        raise HTTPException(status_code=502, detail="No payment URL received")

    pool = get_pool()
    await pool.execute(
        """
        INSERT INTO payments (telegram_id, invoice_id, order_id, amount, currency, tokens, product_type, product_name, status, payment_url)
        VALUES ($1, $2, $3, $4, 'RUB', $5, $6, $7, 'created', $8)
        """,
        telegram_id, bill_id, order_id, req.amount,
        req.tokens, req.product_type, req.product_name, payment_url,
    )

    logger.info("Pally payment created: order=%s bill=%s user=%s tokens=%s",
                order_id, bill_id, telegram_id, req.tokens)

    return CreatePaymentResponse(payment_url=payment_url, order_id=order_id)


@router.post("/payments/pally/webhook")
async def pally_webhook(request: Request):
    """Handle Pally postback — form-urlencoded POST to Result URL."""
    form = await request.form()
    logger.info("Pally webhook received: %s", dict(form))

    inv_id = form.get("InvId", "")
    out_sum = form.get("OutSum", "")
    status = form.get("Status", "")
    signature = form.get("SignatureValue", "")
    trs_id = form.get("TrsId", "")

    if not inv_id or not signature:
        raise HTTPException(status_code=400, detail="Missing required fields")

    # Verify signature: MD5(OutSum:InvId:apiToken).upper()
    expected = hashlib.md5(
        f"{out_sum}:{inv_id}:{PALLY_API_TOKEN}".encode()
    ).hexdigest().upper()

    if expected != signature:
        logger.warning("Pally signature mismatch for order %s: expected=%s got=%s",
                       inv_id, expected, signature)
        raise HTTPException(status_code=403, detail="Invalid signature")

    if status not in ("SUCCESS", "OVERPAID"):
        logger.info("Pally webhook status=%s for order %s, skipping", status, inv_id)
        return "OK"

    pool = get_pool()

    # Find payment by order_id (InvId = our order_id)
    payment = await pool.fetchrow(
        "SELECT id, telegram_id, tokens, status FROM payments WHERE order_id = $1",
        inv_id,
    )
    if not payment:
        # Try by invoice_id (bill_id = TrsId)
        payment = await pool.fetchrow(
            "SELECT id, telegram_id, tokens, status FROM payments WHERE invoice_id = $1",
            trs_id,
        )
    if not payment:
        logger.warning("Pally webhook: payment not found for InvId=%s TrsId=%s", inv_id, trs_id)
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment["status"] == "paid":
        return "OK"

    telegram_id = payment["telegram_id"]
    tokens = payment["tokens"]

    # Credit tokens to user
    await pool.execute(
        "UPDATE users SET photo_credits = photo_credits + $1 WHERE telegram_id = $2",
        tokens, telegram_id,
    )

    # Log transaction
    await pool.execute(
        "INSERT INTO credit_transactions (telegram_id, credit_type, amount, reason) "
        "VALUES ($1, 'photo', $2, 'purchase')",
        telegram_id, tokens,
    )

    # Update payment status
    await pool.execute(
        "UPDATE payments SET status = 'paid', paid_at = NOW() WHERE id = $1",
        payment["id"],
    )

    logger.info("Pally payment completed: order=%s user=%s tokens=+%s",
                inv_id, telegram_id, tokens)

    return "OK"


@router.get("/payments/pally/status/{order_id}", response_model=PaymentStatusOut)
async def pally_payment_status(order_id: str, user: dict = Depends(get_current_user)):
    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT order_id, status, tokens, created_at, paid_at "
        "FROM payments WHERE order_id = $1 AND telegram_id = $2",
        order_id, user["id"],
    )
    if not row:
        raise HTTPException(status_code=404, detail="Payment not found")

    return PaymentStatusOut(
        order_id=row["order_id"],
        status=row["status"],
        tokens=row["tokens"],
        created_at=str(row["created_at"]),
        paid_at=str(row["paid_at"]) if row["paid_at"] else None,
    )
