-- Database schema for GasGen image storage with vector search
-- Using PostgreSQL with pgvector extension

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main posts table
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    publication_id VARCHAR(255) UNIQUE NOT NULL,
    prompt TEXT NOT NULL,
    model_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Vector embedding for semantic search (384 dimensions for all-MiniLM-L6-v2)
    prompt_embedding vector(384),
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS posts_embedding_idx ON posts
USING ivfflat (prompt_embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for fast publication_id lookups
CREATE INDEX IF NOT EXISTS posts_publication_id_idx ON posts(publication_id);

-- Index for model filtering
CREATE INDEX IF NOT EXISTS posts_model_name_idx ON posts(model_name);

-- Index for metadata queries
CREATE INDEX IF NOT EXISTS posts_metadata_idx ON posts USING gin(metadata);

-- Images table (for both result and reference images)
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    image_type VARCHAR(50) NOT NULL CHECK (image_type IN ('result', 'reference')),
    -- Store image as binary data
    image_data BYTEA NOT NULL,
    -- Original filename and metadata
    filename VARCHAR(255),
    content_type VARCHAR(100),
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    -- For reference images, track the order
    reference_order INTEGER,
    -- Original URL if available
    original_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Image embedding for visual similarity search (optional, for future)
    image_embedding vector(512)
);

-- Indexes for images
CREATE INDEX IF NOT EXISTS images_post_id_idx ON images(post_id);
CREATE INDEX IF NOT EXISTS images_type_idx ON images(image_type);
CREATE INDEX IF NOT EXISTS images_post_type_idx ON images(post_id, image_type);

-- Categories/Models statistics table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    emoji VARCHAR(10),
    post_count INTEGER DEFAULT 0,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for category lookups
CREATE INDEX IF NOT EXISTS categories_name_idx ON categories(name);

-- Function to update post count when posts are added/removed
CREATE OR REPLACE FUNCTION update_category_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO categories (name, post_count)
        VALUES (NEW.model_name, 1)
        ON CONFLICT (name)
        DO UPDATE SET post_count = categories.post_count + 1;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE categories
        SET post_count = post_count - 1
        WHERE name = OLD.model_name;
    ELSIF TG_OP = 'UPDATE' AND NEW.model_name != OLD.model_name THEN
        UPDATE categories
        SET post_count = post_count - 1
        WHERE name = OLD.model_name;

        INSERT INTO categories (name, post_count)
        VALUES (NEW.model_name, 1)
        ON CONFLICT (name)
        DO UPDATE SET post_count = categories.post_count + 1;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic category counting
CREATE TRIGGER update_category_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION update_category_count();

-- View for easy querying posts with image counts
CREATE OR REPLACE VIEW posts_with_image_counts AS
SELECT
    p.*,
    COUNT(CASE WHEN i.image_type = 'result' THEN 1 END) as result_image_count,
    COUNT(CASE WHEN i.image_type = 'reference' THEN 1 END) as reference_image_count
FROM posts p
LEFT JOIN images i ON p.id = i.post_id
GROUP BY p.id;

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION search_similar_posts(
    query_embedding vector(384),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    filter_model varchar DEFAULT NULL
)
RETURNS TABLE (
    id int,
    publication_id varchar,
    prompt text,
    model_name varchar,
    similarity float
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.publication_id,
        p.prompt,
        p.model_name,
        1 - (p.prompt_embedding <=> query_embedding) as similarity
    FROM posts p
    WHERE
        (filter_model IS NULL OR p.model_name = filter_model)
        AND (1 - (p.prompt_embedding <=> query_embedding)) > match_threshold
    ORDER BY p.prompt_embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE posts IS 'Main table storing AI-generated image posts with prompts and embeddings';
COMMENT ON TABLE images IS 'Binary storage for result and reference images';
COMMENT ON TABLE categories IS 'Categories/models with statistics';
COMMENT ON COLUMN posts.prompt_embedding IS 'Vector embedding of prompt for semantic search using all-MiniLM-L6-v2 (384 dim)';
COMMENT ON COLUMN images.image_data IS 'Binary image data stored in database';
COMMENT ON COLUMN images.image_embedding IS 'Optional: visual embedding for image similarity search';
