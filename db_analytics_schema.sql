-- Analytics and user metrics tables for GasGen bot

-- Users table to track all bot users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    language_code VARCHAR(10),
    is_bot BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- User preferences
    preferences JSONB DEFAULT '{}'::jsonb
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS users_telegram_id_idx ON users(telegram_id);
CREATE INDEX IF NOT EXISTS users_last_active_idx ON users(last_active_at DESC);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at DESC);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    actions_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_started_at_idx ON user_sessions(started_at DESC);

-- User actions/events tracking
CREATE TABLE IF NOT EXISTS user_actions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS user_actions_user_id_idx ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS user_actions_type_idx ON user_actions(action_type);
CREATE INDEX IF NOT EXISTS user_actions_created_at_idx ON user_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS user_actions_type_time_idx ON user_actions(action_type, created_at DESC);

-- Button clicks tracking
CREATE TABLE IF NOT EXISTS button_clicks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    button_type VARCHAR(100) NOT NULL,
    button_data VARCHAR(255),
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS button_clicks_user_id_idx ON button_clicks(user_id);
CREATE INDEX IF NOT EXISTS button_clicks_type_idx ON button_clicks(button_type);
CREATE INDEX IF NOT EXISTS button_clicks_created_at_idx ON button_clicks(created_at DESC);

-- Model usage tracking
CREATE TABLE IF NOT EXISTS model_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_name VARCHAR(255) NOT NULL,
    post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
    search_query TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS model_usage_user_id_idx ON model_usage(user_id);
CREATE INDEX IF NOT EXISTS model_usage_model_idx ON model_usage(model_name);
CREATE INDEX IF NOT EXISTS model_usage_post_id_idx ON model_usage(post_id);
CREATE INDEX IF NOT EXISTS model_usage_created_at_idx ON model_usage(created_at DESC);

-- Search queries tracking
CREATE TABLE IF NOT EXISTS search_queries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    category_filter VARCHAR(255),
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS search_queries_user_id_idx ON search_queries(user_id);
CREATE INDEX IF NOT EXISTS search_queries_created_at_idx ON search_queries(created_at DESC);

-- Daily statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_stats AS
SELECT
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_actions
FROM user_actions
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE UNIQUE INDEX IF NOT EXISTS daily_stats_date_idx ON daily_stats(date);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_daily_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_stats;
END;
$$ LANGUAGE plpgsql;

-- Analytics views for easy querying

-- Most popular models
CREATE OR REPLACE VIEW popular_models AS
SELECT
    model_name,
    COUNT(*) as usage_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as usage_last_7days,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as usage_last_30days
FROM model_usage
GROUP BY model_name
ORDER BY usage_count DESC;

-- User activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
    u.telegram_id,
    u.username,
    u.first_name,
    u.created_at as joined_at,
    u.last_active_at,
    COUNT(DISTINCT ua.id) as total_actions,
    COUNT(DISTINCT mu.id) as model_views,
    COUNT(DISTINCT sq.id) as searches,
    COUNT(DISTINCT bc.id) as button_clicks
FROM users u
LEFT JOIN user_actions ua ON u.id = ua.user_id
LEFT JOIN model_usage mu ON u.id = mu.user_id
LEFT JOIN search_queries sq ON u.id = sq.user_id
LEFT JOIN button_clicks bc ON u.id = bc.user_id
GROUP BY u.id, u.telegram_id, u.username, u.first_name, u.created_at, u.last_active_at
ORDER BY u.last_active_at DESC;

-- Most active users
CREATE OR REPLACE VIEW most_active_users AS
SELECT
    u.telegram_id,
    u.username,
    u.first_name,
    COUNT(ua.id) as action_count,
    MAX(ua.created_at) as last_action_at
FROM users u
JOIN user_actions ua ON u.id = ua.user_id
WHERE ua.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.telegram_id, u.username, u.first_name
ORDER BY action_count DESC
LIMIT 100;

-- Button click statistics
CREATE OR REPLACE VIEW button_stats AS
SELECT
    button_type,
    COUNT(*) as click_count,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(created_at) as last_clicked_at
FROM button_clicks
GROUP BY button_type
ORDER BY click_count DESC;

-- Hourly activity pattern
CREATE OR REPLACE VIEW hourly_activity AS
SELECT
    EXTRACT(HOUR FROM created_at) as hour,
    COUNT(*) as action_count,
    COUNT(DISTINCT user_id) as unique_users
FROM user_actions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;

-- User retention (day 1, day 7, day 30)
CREATE OR REPLACE VIEW user_retention AS
SELECT
    DATE(created_at) as cohort_date,
    COUNT(*) as total_users,
    COUNT(*) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM user_actions ua
            WHERE ua.user_id = users.id
            AND ua.created_at::date = users.created_at::date + INTERVAL '1 day'
        )
    ) as day1_retained,
    COUNT(*) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM user_actions ua
            WHERE ua.user_id = users.id
            AND ua.created_at::date = users.created_at::date + INTERVAL '7 days'
        )
    ) as day7_retained,
    COUNT(*) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM user_actions ua
            WHERE ua.user_id = users.id
            AND ua.created_at::date = users.created_at::date + INTERVAL '30 days'
        )
    ) as day30_retained
FROM users
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY cohort_date DESC;

-- Helper functions for analytics

-- Track user action
CREATE OR REPLACE FUNCTION track_user_action(
    p_telegram_id BIGINT,
    p_action_type VARCHAR(50),
    p_action_data JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    -- Get or create user
    SELECT id INTO v_user_id FROM users WHERE telegram_id = p_telegram_id;

    IF v_user_id IS NULL THEN
        INSERT INTO users (telegram_id) VALUES (p_telegram_id) RETURNING id INTO v_user_id;
    END IF;

    -- Update last active
    UPDATE users SET last_active_at = NOW() WHERE id = v_user_id;

    -- Insert action
    INSERT INTO user_actions (user_id, action_type, action_data)
    VALUES (v_user_id, p_action_type, p_action_data);
END;
$$ LANGUAGE plpgsql;

-- Track button click
CREATE OR REPLACE FUNCTION track_button_click(
    p_telegram_id BIGINT,
    p_button_type VARCHAR(100),
    p_button_data VARCHAR(255) DEFAULT NULL,
    p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    SELECT id INTO v_user_id FROM users WHERE telegram_id = p_telegram_id;

    IF v_user_id IS NULL THEN
        INSERT INTO users (telegram_id) VALUES (p_telegram_id) RETURNING id INTO v_user_id;
    END IF;

    UPDATE users SET last_active_at = NOW() WHERE id = v_user_id;

    INSERT INTO button_clicks (user_id, button_type, button_data, context)
    VALUES (v_user_id, p_button_type, p_button_data, p_context);

    -- Also track as action
    PERFORM track_user_action(p_telegram_id, 'button_click', jsonb_build_object(
        'button_type', p_button_type,
        'button_data', p_button_data
    ));
END;
$$ LANGUAGE plpgsql;

-- Track model usage
CREATE OR REPLACE FUNCTION track_model_usage(
    p_telegram_id BIGINT,
    p_model_name VARCHAR(255),
    p_post_id INTEGER DEFAULT NULL,
    p_search_query TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    SELECT id INTO v_user_id FROM users WHERE telegram_id = p_telegram_id;

    IF v_user_id IS NULL THEN
        INSERT INTO users (telegram_id) VALUES (p_telegram_id) RETURNING id INTO v_user_id;
    END IF;

    UPDATE users SET last_active_at = NOW() WHERE id = v_user_id;

    INSERT INTO model_usage (user_id, model_name, post_id, search_query)
    VALUES (v_user_id, p_model_name, p_post_id, p_search_query);

    PERFORM track_user_action(p_telegram_id, 'model_view', jsonb_build_object(
        'model_name', p_model_name,
        'post_id', p_post_id
    ));
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE users IS 'All Telegram bot users';
COMMENT ON TABLE user_actions IS 'All user actions for analytics';
COMMENT ON TABLE button_clicks IS 'Button click tracking';
COMMENT ON TABLE model_usage IS 'Model view and usage tracking';
COMMENT ON TABLE search_queries IS 'Search query tracking';
