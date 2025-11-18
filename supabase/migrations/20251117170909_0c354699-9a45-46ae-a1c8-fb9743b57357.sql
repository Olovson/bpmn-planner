-- Create bpmn_docs table to track generated documentation
CREATE TABLE IF NOT EXISTS public.bpmn_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bpmn_file TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bpmn_docs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view docs"
  ON public.bpmn_docs
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert docs"
  ON public.bpmn_docs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update docs"
  ON public.bpmn_docs
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete docs"
  ON public.bpmn_docs
  FOR DELETE
  USING (auth.uid() IS NOT NULL);