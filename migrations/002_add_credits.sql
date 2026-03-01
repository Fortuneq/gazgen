-- Add credit columns to users table (default 0 — no free tokens)
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_credits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS video_credits INTEGER NOT NULL DEFAULT 0;

-- Create credit transactions log
CREATE TABLE IF NOT EXISTS credit_transactions (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    credit_type VARCHAR(10) NOT NULL,  -- 'photo' or 'video'
    amount INTEGER NOT NULL,           -- negative=spend, positive=purchase
    reason VARCHAR(100) NOT NULL,      -- 'generation', 'purchase', 'bonus'
    task_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(telegram_id);

-- Model pricing table (cost per generation, 1 credit = 1 RUB)
-- Tiers from Photix_Economics_v2:
--   Photo Standard = 9₽, Photo Pro = 19₽, Photo Ultra = 35₽
CREATE TABLE IF NOT EXISTS model_prices (
    model_key VARCHAR(50) PRIMARY KEY,
    credit_cost INTEGER NOT NULL DEFAULT 9
);

INSERT INTO model_prices (model_key, credit_cost) VALUES
    ('nano_banana', 9),   -- Photo Standard
    ('seedream', 9),      -- Photo Standard
    ('seedream_v4', 9),   -- Photo Standard
    ('qwen', 9),          -- Photo Standard
    ('grok', 9),          -- Photo Standard
    ('banana', 19),       -- Photo Pro
    ('gpt_text', 19),     -- Photo Pro
    ('gpt_img2img', 19),  -- Photo Pro
    ('gpt4o', 35)         -- Photo Ultra
ON CONFLICT (model_key) DO UPDATE SET credit_cost = EXCLUDED.credit_cost;
