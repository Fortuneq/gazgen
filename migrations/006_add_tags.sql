-- Add tags column to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS posts_tags_idx ON posts USING GIN(tags);

-- Tag settings table (display names, emoji, hidden)
CREATE TABLE IF NOT EXISTS tag_settings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    emoji VARCHAR(10) DEFAULT '',
    hidden BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0
);

-- Seed initial data from hardcoded TAG_DISPLAY
INSERT INTO tag_settings (name, display_name, emoji, hidden, sort_order) VALUES
    ('portrait', 'Портреты', '🖼', false, 1),
    ('fullbody', 'В полный рост', '🧍', false, 2),
    ('abstract', 'Абстракция', '🎨', false, 3),
    ('object', 'Объекты', '🎁', false, 4),
    ('fashion', 'Мода', '👗', false, 5),
    ('landscape', 'Пейзажи', '🏞', false, 6),
    ('animal', 'Животные', '🐾', false, 7),
    ('couple', 'Пары', '💑', false, 8),
    ('group', 'Группа', '👥', false, 9),
    ('anime', 'Аниме', '🎌', false, 10),
    ('male', 'Мужчины', '🧑', true, 99),
    ('female', 'Женщины', '👩', true, 99)
ON CONFLICT (name) DO NOTHING;
