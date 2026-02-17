-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, -- Storing plain text for MVP as requested check, but let's call it password_hash for semantic correctness in future
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the default user 'YC' with password 'str0ngpassword'
-- Note: In a real app, you should HASH this password (e.g., bcrypt).
-- For this MVP as requested, we will check against the plain string or a simple match.
-- Attempting to insert, doing nothing if username exists to avoid duplicates.
INSERT INTO users (username, password_hash)
VALUES ('YC', 'str0ngpassword')
ON CONFLICT (username) DO NOTHING;
