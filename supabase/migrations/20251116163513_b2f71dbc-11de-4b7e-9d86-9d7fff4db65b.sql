-- Create enum for criterion types
CREATE TYPE public.criterion_type AS ENUM ('dor', 'dod');

-- Create enum for criterion categories
CREATE TYPE public.criterion_category AS ENUM (
  'process_krav',
  'data_input_output', 
  'design',
  'teknik_arkitektur',
  'test_kvalitet',
  'planering_beroenden',
  'team_alignment',
  'funktion_krav',
  'data_api',
  'teknik_drift',
  'dokumentation',
  'overlamning'
);

-- Table for storing DoR/DoD criterion status
CREATE TABLE public.dor_dod_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subprocess_name TEXT NOT NULL, -- e.g. 'credit-evaluation', 'stakeholder'
  criterion_type criterion_type NOT NULL,
  criterion_category criterion_category NOT NULL,
  criterion_key TEXT NOT NULL, -- unique identifier for the criterion
  criterion_text TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(subprocess_name, criterion_type, criterion_key)
);

-- Enable RLS
ALTER TABLE public.dor_dod_status ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "All authenticated users can view status"
ON public.dor_dod_status
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can update status"
ON public.dor_dod_status
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "All authenticated users can insert status"
ON public.dor_dod_status
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_dor_dod_status_updated_at
BEFORE UPDATE ON public.dor_dod_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dor_dod_status;

-- Create indexes for better performance
CREATE INDEX idx_dor_dod_status_subprocess ON public.dor_dod_status(subprocess_name);
CREATE INDEX idx_dor_dod_status_type ON public.dor_dod_status(criterion_type);
CREATE INDEX idx_dor_dod_status_completed ON public.dor_dod_status(is_completed);