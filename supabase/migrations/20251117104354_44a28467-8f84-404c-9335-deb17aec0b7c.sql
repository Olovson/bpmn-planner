-- Add dependency tracking table
CREATE TABLE IF NOT EXISTS public.bpmn_dependencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_file TEXT NOT NULL,
  child_process TEXT NOT NULL,
  child_file TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_file, child_process)
);

-- Add structure change flag to bpmn_files
ALTER TABLE public.bpmn_files 
ADD COLUMN IF NOT EXISTS has_structure_changes BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.bpmn_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS policies for bpmn_dependencies
CREATE POLICY "Anyone can view dependencies"
ON public.bpmn_dependencies FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert dependencies"
ON public.bpmn_dependencies FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update dependencies"
ON public.bpmn_dependencies FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete dependencies"
ON public.bpmn_dependencies FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger to update updated_at
CREATE TRIGGER update_bpmn_dependencies_updated_at
BEFORE UPDATE ON public.bpmn_dependencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();