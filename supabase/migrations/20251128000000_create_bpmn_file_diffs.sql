-- Create bpmn_file_diffs table to track changes between BPMN file versions
CREATE TABLE public.bpmn_file_diffs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bpmn_file_id UUID NOT NULL REFERENCES public.bpmn_files(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  diff_type TEXT NOT NULL CHECK (diff_type IN ('added', 'removed', 'modified', 'unchanged')),
  node_key TEXT NOT NULL, -- Format: "bpmnFile::bpmnElementId"
  node_type TEXT NOT NULL, -- 'callActivity', 'userTask', 'serviceTask', 'businessRuleTask', etc.
  node_name TEXT,
  old_content JSONB, -- Previous version metadata (name, type, etc.)
  new_content JSONB, -- New version metadata
  diff_details JSONB, -- Detailed changes (what fields changed)
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ, -- When user marked as resolved/regenerated
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX idx_bpmn_file_diffs_file_id ON public.bpmn_file_diffs(bpmn_file_id);
CREATE INDEX idx_bpmn_file_diffs_file_name ON public.bpmn_file_diffs(file_name);
CREATE INDEX idx_bpmn_file_diffs_node_key ON public.bpmn_file_diffs(node_key);
CREATE INDEX idx_bpmn_file_diffs_resolved ON public.bpmn_file_diffs(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_bpmn_file_diffs_detected_at ON public.bpmn_file_diffs(detected_at DESC);

-- Enable RLS
ALTER TABLE public.bpmn_file_diffs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view bpmn file diffs"
  ON public.bpmn_file_diffs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert diffs"
  ON public.bpmn_file_diffs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update diffs"
  ON public.bpmn_file_diffs FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete diffs"
  ON public.bpmn_file_diffs FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Add previous_version_content to bpmn_files for diff comparison
ALTER TABLE public.bpmn_files 
ADD COLUMN IF NOT EXISTS previous_version_content TEXT, -- Previous BPMN XML content
ADD COLUMN IF NOT EXISTS previous_version_meta JSONB, -- Previous parsed metadata
ADD COLUMN IF NOT EXISTS last_diff_calculated_at TIMESTAMPTZ;

-- Add comment
COMMENT ON TABLE public.bpmn_file_diffs IS 'Tracks changes between BPMN file versions to enable selective regeneration of documentation';
COMMENT ON COLUMN public.bpmn_file_diffs.node_key IS 'Unique identifier: "bpmnFile::bpmnElementId"';
COMMENT ON COLUMN public.bpmn_file_diffs.diff_type IS 'Type of change: added (new node), removed (deleted node), modified (changed node), unchanged (no change)';
COMMENT ON COLUMN public.bpmn_file_diffs.diff_details IS 'JSON object with detailed field-level changes, e.g. {"name": {"old": "...", "new": "..."}, "type": {"old": "...", "new": "..."}}';


