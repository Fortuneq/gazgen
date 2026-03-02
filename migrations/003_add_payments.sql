CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    invoice_id VARCHAR(255) UNIQUE,
    order_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RUB',
    tokens INTEGER NOT NULL,
    product_type VARCHAR(20) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'created',
    payment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(telegram_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
