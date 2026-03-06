-- Add reference_urls column to user_generations
ALTER TABLE user_generations ADD COLUMN IF NOT EXISTS reference_urls TEXT[];
