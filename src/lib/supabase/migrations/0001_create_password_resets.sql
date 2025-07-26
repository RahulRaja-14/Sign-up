-- migrations/create_password_resets.sql

-- 1. Create the password_resets table
CREATE TABLE IF NOT EXISTS public.password_resets (
    email TEXT PRIMARY KEY,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- 2. Add comments to the table and columns for clarity
COMMENT ON TABLE public.password_resets IS 'Stores tokens for password reset requests.';
COMMENT ON COLUMN public.password_resets.email IS 'The email of the user requesting a password reset. Acts as the primary key.';
COMMENT ON COLUMN public.password_resets.token IS 'The secure token for the password reset. Should be stored hashed.';
COMMENT ON COLUMN public.password_resets.expires_at IS 'The timestamp when the password reset token expires.';

-- 3. Enable Row-Level Security (RLS) on the table
-- This is a security best practice. By default, it denies all access.
-- We will need to create specific policies to allow access.
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- 4. Create an RLS policy to allow service_role to perform all actions
-- This gives our backend full control over the table, which is necessary for creating,
-- reading, and deleting password reset tokens securely.
CREATE POLICY "Enable all access for service_role"
ON public.password_resets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
