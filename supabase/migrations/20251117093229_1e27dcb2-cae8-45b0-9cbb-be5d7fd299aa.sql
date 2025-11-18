-- Create table for node to test file links (structure, not results)
CREATE TABLE IF NOT EXISTS public.node_test_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bpmn_file text NOT NULL,
  bpmn_element_id text NOT NULL,
  test_file_path text NOT NULL,
  test_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(bpmn_file, bpmn_element_id, test_file_path)
);

-- Enable RLS
ALTER TABLE public.node_test_links ENABLE ROW LEVEL SECURITY;

-- Policies for node_test_links
CREATE POLICY "Anyone can view node test links"
  ON public.node_test_links
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert node test links"
  ON public.node_test_links
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update node test links"
  ON public.node_test_links
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete node test links"
  ON public.node_test_links
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_node_test_links_updated_at
  BEFORE UPDATE ON public.node_test_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_node_test_links_bpmn_file ON public.node_test_links(bpmn_file);
CREATE INDEX idx_node_test_links_element_id ON public.node_test_links(bpmn_element_id);