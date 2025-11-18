-- Create table for E2E (end-to-end) test scenarios
CREATE TABLE IF NOT EXISTS public.e2e_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  bpmn_file TEXT NOT NULL,
  path JSONB NOT NULL DEFAULT '{}',
  tags JSONB NOT NULL DEFAULT '[]',
  test_file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_scenario_name UNIQUE (initiative, name)
);

-- Enable RLS
ALTER TABLE public.e2e_scenarios ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view E2E scenarios
CREATE POLICY "Anyone can view e2e scenarios"
  ON public.e2e_scenarios
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert E2E scenarios
CREATE POLICY "Authenticated users can insert e2e scenarios"
  ON public.e2e_scenarios
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update E2E scenarios
CREATE POLICY "Authenticated users can update e2e scenarios"
  ON public.e2e_scenarios
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete E2E scenarios
CREATE POLICY "Authenticated users can delete e2e scenarios"
  ON public.e2e_scenarios
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_e2e_scenarios_updated_at
  BEFORE UPDATE ON public.e2e_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_e2e_scenarios_initiative ON public.e2e_scenarios(initiative);
CREATE INDEX IF NOT EXISTS idx_e2e_scenarios_bpmn_file ON public.e2e_scenarios(bpmn_file);