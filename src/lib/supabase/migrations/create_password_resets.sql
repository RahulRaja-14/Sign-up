-- In your Supabase project's SQL Editor, run the following query to create the table.

CREATE TABLE public.password_resets (
  email TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  session_token TEXT,
  session_expires_at TIMESTAMPTZ
);

-- Optional: Add a policy to allow public access for upserting, but secure it properly.
-- For this demo, we'll keep it simple, but in production, you'd want row-level security.

ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON public.password_resets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select" ON public.password_resets FOR SELECT USING (true);
CREATE POLICY "Allow public update" ON public.password_resets FOR UPDATE USING (true);
