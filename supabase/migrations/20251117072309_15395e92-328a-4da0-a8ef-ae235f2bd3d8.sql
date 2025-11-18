-- Create storage bucket for BPMN/DMN files
INSERT INTO storage.buckets (id, name, public)
VALUES ('bpmn-files', 'bpmn-files', true);

-- Create bpmn_files metadata table
CREATE TABLE public.bpmn_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  file_type TEXT NOT NULL CHECK (file_type IN ('bpmn', 'dmn')),
  size_bytes BIGINT,
  github_synced BOOLEAN DEFAULT false,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bpmn_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view bpmn files"
  ON public.bpmn_files FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert files"
  ON public.bpmn_files FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update files"
  ON public.bpmn_files FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete files"
  ON public.bpmn_files FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Storage policies for bpmn-files bucket
CREATE POLICY "Anyone can view bpmn files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bpmn-files');

CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bpmn-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'bpmn-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'bpmn-files' AND auth.uid() IS NOT NULL);

-- Trigger to update last_updated_at
CREATE TRIGGER update_bpmn_files_updated_at
  BEFORE UPDATE ON public.bpmn_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();