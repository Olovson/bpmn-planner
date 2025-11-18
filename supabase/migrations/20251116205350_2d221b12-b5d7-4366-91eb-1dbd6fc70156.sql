-- Add columns for BPMN node type and identification
ALTER TABLE dor_dod_status
  ADD COLUMN IF NOT EXISTS node_type TEXT,
  ADD COLUMN IF NOT EXISTS bpmn_element_id TEXT,
  ADD COLUMN IF NOT EXISTS bpmn_file TEXT;

-- Add index for better query performance when filtering by node_type
CREATE INDEX IF NOT EXISTS idx_dor_dod_status_node_type ON dor_dod_status(node_type);

-- Add index for looking up by BPMN element
CREATE INDEX IF NOT EXISTS idx_dor_dod_status_bpmn_element ON dor_dod_status(bpmn_element_id, bpmn_file);