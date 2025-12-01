-- Create table for storing timeline dates (user-edited dates for Gantt tasks)
CREATE TABLE IF NOT EXISTS public.timeline_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  root_bpmn_file TEXT NOT NULL, -- e.g., "mortgage.bpmn"
  bpmn_file TEXT NOT NULL, -- The BPMN file containing the element
  element_id TEXT NOT NULL, -- The BPMN element ID
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER NOT NULL, -- Calculated from start_date and end_date
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  -- Unique constraint: one date override per element per root file
  CONSTRAINT unique_timeline_date UNIQUE (root_bpmn_file, bpmn_file, element_id)
);

-- Enable RLS
ALTER TABLE public.timeline_dates ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view timeline dates
CREATE POLICY "Authenticated users can view timeline dates"
  ON public.timeline_dates
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: All authenticated users can insert timeline dates
CREATE POLICY "Authenticated users can insert timeline dates"
  ON public.timeline_dates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: All authenticated users can update timeline dates
CREATE POLICY "Authenticated users can update timeline dates"
  ON public.timeline_dates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: All authenticated users can delete timeline dates
CREATE POLICY "Authenticated users can delete timeline dates"
  ON public.timeline_dates
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger function to update updated_at and updated_by
CREATE OR REPLACE FUNCTION public.set_timeline_dates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS set_timeline_dates_updated_at ON public.timeline_dates;
CREATE TRIGGER set_timeline_dates_updated_at
  BEFORE UPDATE ON public.timeline_dates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timeline_dates_updated_at();

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_timeline_dates_root_file ON public.timeline_dates(root_bpmn_file);
CREATE INDEX IF NOT EXISTS idx_timeline_dates_bpmn_file_element ON public.timeline_dates(bpmn_file, element_id);
CREATE INDEX IF NOT EXISTS idx_timeline_dates_updated_at ON public.timeline_dates(updated_at DESC);

