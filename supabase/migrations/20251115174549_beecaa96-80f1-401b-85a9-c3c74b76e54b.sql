-- Add subprocess_bpmn_file column to store the subprocess file name
ALTER TABLE public.bpmn_element_mappings 
ADD COLUMN subprocess_bpmn_file text;