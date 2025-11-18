-- Create versions table for tracking changes
CREATE TABLE public.versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.versions ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view all versions but only create their own
CREATE POLICY "Users can view all versions"
  ON public.versions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own versions"
  ON public.versions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_versions_created_at ON public.versions(created_at DESC);
CREATE INDEX idx_versions_user_id ON public.versions(user_id);