-- Add file_urls column to assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS file_urls TEXT[];