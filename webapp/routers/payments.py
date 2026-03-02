import hashlib
import hmac
import logging
import uuid

import httpx
from fastapi import APIRouter, HTTPException, Depends, Request

from webapp.auth import get_current_user
from webapp.config import CRYPTOCLOUD_API_KEY, CRYPTOCLOUD_SHOP_ID, CRYPTOCLOUD_SECRET
from webapp.db import get_pool
from webapp.models import CreatePaymentRequest, CreatePaymentResponse, PaymentStatusOut

router = APIRouter()
logger = logging.getLogger(__name__)

CRYPTOCLOUD_API = "https://api.cryptocloud.plus/v2"


@router.post("/payments/create", response_model=CreatePaymentResponse)
async def create_payment(req: CreatePaymentRequest, user: dict = Depends(get_current_user)):
    telegram_id = user["id"]
    order_id = f"order_{telegram_id}_{uuid.uuid4().hex[:12]}"

    # Create invoice via CryptoCloud API
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{CRYPTOCLOUD_API}/invoice/create",
            headers={"Authorization": f"Token {CRYPTOCLOUD_API_KEY}"},
            json={
                "amount": req.amount,
                "shop_id": CRYPTOCLOUD_SHOP_ID,
                "order_id": order_id,
                "currency": "RUB",
            },
        )

    if resp.status_code != 200:
        logger.error("CryptoCloud error %s: %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="Payment service error")

    data = resp.json()
    result = data.get("result") or data
    invoice_id = result.get("uuid") or result.get("invoice_id")
    payment_url = result.get("link") or result.get("pay_url", "")

    if not payment_url:
        logger.error("CryptoCloud no payment URL in response: %s", data)
        raise HTTPException(status_code=502, detail="No payment URL received")

    # Save payment record
    pool = get_pool()
    await pool.execute(
        """
        INSERT INTO payments (telegram_id, invoice_id, order_id, amount, currency, tokens, product_type, product_name, status, payment_url)
        VALUES ($1, $2, $3, $4, 'RUB', $5, $6, $7, 'created', $8)
        """,
        telegram_id, invoice_id, order_id, req.amount,
        req.tokens, req.product_type, req.product_name, payment_url,
    )

    logger.info("Payment created: order=%s invoice=%s user=%s tokens=%s",
                order_id, invoice_id, telegram_id, req.tokens)

    return CreatePaymentResponse(payment_url=payment_url, order_id=order_id)


@router.post("/payments/webhook")
async def payment_webhook(request: Request):
    """Handle CryptoCloud webhook callback — no auth, verified by signature."""
    body = await request.json()
    logger.info("Webhook received: %s", body)

    # Verify signature
    token = body.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Missing token")

    # CryptoCloud signs: hmac_sha256(secret, invoice_id)
    invoice_id = body.get("invoice_id") or body.get("uuid", "")
    expected = hmac.new(
        CRYPTOCLOUD_SECRET.encode(), invoice_id.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, token):
        logger.warning("Webhook signature mismatch for invoice %s", invoice_id)
        raise HTTPException(status_code=403, detail="Invalid signature")

    status = body.get("status", "")
    if status not in ("paid", "success"):
        # Not a payment confirmation, just ack
        return {"ok": True}

    pool = get_pool()

    # Find payment by invoice_id
    payment = await pool.fetchrow(
        "SELECT id, telegram_id, tokens, status FROM payments WHERE invoice_id = $1",
        invoice_id,
    )
    if not payment:
        logger.warning("Webhook: payment not found for invoice %s", invoice_id)
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment["status"] == "paid":
        # Already processed — idempotent
        return {"ok": True}

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

    logger.info("Payment completed: invoice=%s user=%s tokens=+%s",
                invoice_id, telegram_id, tokens)

    return {"ok": True}


@router.get("/payments/status/{order_id}", response_model=PaymentStatusOut)
async def payment_status(order_id: str, user: dict = Depends(get_current_user)):
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
