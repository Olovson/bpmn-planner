-- Add figma_url column to bpmn_element_mappings table
ALTER TABLE bpmn_element_mappings 
ADD COLUMN figma_url TEXT;

COMMENT ON COLUMN bpmn_element_mappings.figma_url IS 'URL to Figma design for this BPMN element';
