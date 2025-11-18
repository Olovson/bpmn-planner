-- Add dmn_file column to bpmn_element_mappings table
ALTER TABLE public.bpmn_element_mappings 
ADD COLUMN dmn_file TEXT;