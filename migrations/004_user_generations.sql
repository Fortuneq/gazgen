-- User generations history
CREATE TABLE IF NOT EXISTS user_generations (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    task_id VARCHAR(255) UNIQUE NOT NULL,
    prompt TEXT,
    model VARCHAR(100) NOT NULL,
    aspect_ratio VARCHAR(20),
    result_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    cost INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_gen_user ON user_generations(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_gen_task ON user_generations(task_id);
