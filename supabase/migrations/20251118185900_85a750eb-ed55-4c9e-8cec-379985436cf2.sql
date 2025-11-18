-- Make documentation files publicly readable in storage
-- This allows the docs/*.html files to be accessed via public URLs

-- Create policy for public read access to docs folder
CREATE POLICY "Public read access to docs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'bpmn-files' AND (storage.foldername(name))[1] = 'docs');
