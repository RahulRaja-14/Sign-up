-- Drop table if it exists to ensure a clean slate
DROP TABLE IF EXISTS public.password_resets;

-- Create the password_resets table
CREATE TABLE public.password_resets (
    email text NOT NULL,
    token text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Add a primary key to the table on the email column
-- This ensures that only one active token can exist per email.
-- When a new request comes in, the old one will be overwritten (due to upsert).
ALTER TABLE public.password_resets 
ADD CONSTRAINT password_resets_pkey PRIMARY KEY (email);

-- Optional: Create an index on the expires_at column for faster cleanup of old tokens
CREATE INDEX password_resets_expires_at_idx ON public.password_resets(expires_at);

-- Enable Row Level Security (RLS) on the table
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- Create policies for the table
-- This table should not be accessible from the client-side at all.
-- These policies effectively deny all access, as all operations will be performed
-- using the service_role key from secure server-side actions.
CREATE POLICY "Deny all access"
ON public.password_resets
FOR ALL
USING (false)
WITH CHECK (false);

-- Informational comment for the developer
-- The table is now created. RLS is enabled and policies are set to deny all
-- client-side access. All interactions with this table must happen from
-- the server-side using the Supabase service role key.
