CREATE TABLE public.user_libraries (
  user_id uuid PRIMARY KEY,
  device_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_libraries TO service_role;
ALTER TABLE public.user_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;