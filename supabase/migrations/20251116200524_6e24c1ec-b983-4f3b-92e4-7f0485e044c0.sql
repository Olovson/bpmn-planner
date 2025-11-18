-- Create table for storing test results from GitHub Actions
CREATE TABLE public.test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_file TEXT NOT NULL UNIQUE,
  node_id TEXT,
  node_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('passing', 'failing', 'pending', 'skipped')),
  test_count INTEGER NOT NULL DEFAULT 0,
  duration NUMERIC,
  last_run TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scenarios JSONB,
  error_message TEXT,
  github_run_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read test results (public data)
CREATE POLICY "Anyone can view test results"
  ON public.test_results
  FOR SELECT
  USING (true);

-- Only authenticated users can insert/update test results (GitHub Actions will use service role)
CREATE POLICY "Service role can insert test results"
  ON public.test_results
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update test results"
  ON public.test_results
  FOR UPDATE
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_test_results_updated_at
  BEFORE UPDATE ON public.test_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_test_results_test_file ON public.test_results(test_file);
CREATE INDEX idx_test_results_node_id ON public.test_results(node_id);
CREATE INDEX idx_test_results_last_run ON public.test_results(last_run DESC);