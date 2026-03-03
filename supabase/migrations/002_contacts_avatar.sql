-- Add avatar_url column to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
