-- Create bpmn_file_versions table for content-based versioning
-- This enables full version history and prevents data loss

CREATE TABLE public.bpmn_file_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bpmn_file_id UUID NOT NULL REFERENCES public.bpmn_files(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  content_hash TEXT NOT NULL, -- SHA-256 hash of BPMN XML content (unique identifier)
  content TEXT NOT NULL, -- BPMN XML content
  meta JSONB NOT NULL, -- Parsed metadata
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id),
  is_current BOOLEAN NOT NULL DEFAULT false, -- Only one version per file can be current
  version_number INTEGER, -- Sequential number (1, 2, 3...) for easy reference
  change_summary TEXT, -- User's description of the change (optional)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(bpmn_file_id, content_hash), -- Same content = same version (deduplication)
  UNIQUE(bpmn_file_id, version_number) -- Sequential number per file
);

-- Indexes for performance
CREATE INDEX idx_bpmn_file_versions_file_id ON public.bpmn_file_versions(bpmn_file_id);
CREATE INDEX idx_bpmn_file_versions_hash ON public.bpmn_file_versions(content_hash);
CREATE INDEX idx_bpmn_file_versions_current ON public.bpmn_file_versions(bpmn_file_id, is_current) WHERE is_current = true;
CREATE INDEX idx_bpmn_file_versions_uploaded_at ON public.bpmn_file_versions(uploaded_at DESC);

-- Enable RLS
ALTER TABLE public.bpmn_file_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view bpmn file versions"
  ON public.bpmn_file_versions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert versions"
  ON public.bpmn_file_versions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update versions"
  ON public.bpmn_file_versions FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete versions"
  ON public.bpmn_file_versions FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Add version tracking columns to bpmn_files
ALTER TABLE public.bpmn_files 
ADD COLUMN IF NOT EXISTS current_version_hash TEXT, -- Hash for current version
ADD COLUMN IF NOT EXISTS current_version_number INTEGER; -- Sequential number for current version

-- Update bpmn_file_diffs to track version hashes
ALTER TABLE public.bpmn_file_diffs
ADD COLUMN IF NOT EXISTS from_version_hash TEXT, -- Hash for version we compare from
ADD COLUMN IF NOT EXISTS to_version_hash TEXT, -- Hash for version we compare to
ADD COLUMN IF NOT EXISTS from_version_number INTEGER,
ADD COLUMN IF NOT EXISTS to_version_number INTEGER;

-- Create index for version-based diff lookups
CREATE INDEX IF NOT EXISTS idx_bpmn_file_diffs_versions ON public.bpmn_file_diffs(from_version_hash, to_version_hash);

-- Comments
COMMENT ON TABLE public.bpmn_file_versions IS 'Stores all versions of BPMN files with content-based hashing for deduplication and full history';
COMMENT ON COLUMN public.bpmn_file_versions.content_hash IS 'SHA-256 hash of BPMN XML content - used as unique version identifier';
COMMENT ON COLUMN public.bpmn_file_versions.is_current IS 'Only one version per file can be current (the active version)';
COMMENT ON COLUMN public.bpmn_file_versions.version_number IS 'Sequential version number per file (1, 2, 3...) for easy reference';
COMMENT ON COLUMN public.bpmn_files.current_version_hash IS 'Hash of the current active version of this BPMN file';
COMMENT ON COLUMN public.bpmn_file_diffs.from_version_hash IS 'Hash of the version we compare from (previous version)';
COMMENT ON COLUMN public.bpmn_file_diffs.to_version_hash IS 'Hash of the version we compare to (new version)';

-- Function to automatically set version_number when inserting
CREATE OR REPLACE FUNCTION public.set_version_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If version_number is not provided, set it to the next sequential number
  IF NEW.version_number IS NULL THEN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO NEW.version_number
    FROM public.bpmn_file_versions
    WHERE bpmn_file_id = NEW.bpmn_file_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_version_number_trigger
  BEFORE INSERT ON public.bpmn_file_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_version_number();

-- Function to ensure only one current version per file
CREATE OR REPLACE FUNCTION public.ensure_single_current_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If this version is being set as current, unset all other current versions for this file
  IF NEW.is_current = true THEN
    UPDATE public.bpmn_file_versions
    SET is_current = false
    WHERE bpmn_file_id = NEW.bpmn_file_id
      AND id != NEW.id
      AND is_current = true;
    
    -- Update bpmn_files to point to this version
    UPDATE public.bpmn_files
    SET current_version_hash = NEW.content_hash,
        current_version_number = NEW.version_number
    WHERE id = NEW.bpmn_file_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_single_current_version_trigger
  AFTER INSERT OR UPDATE ON public.bpmn_file_versions
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION public.ensure_single_current_version();

