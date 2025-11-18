-- Add jira_type column to bpmn_element_mappings
ALTER TABLE public.bpmn_element_mappings 
ADD COLUMN jira_type text NULL;

-- Add a check constraint to ensure only valid values
ALTER TABLE public.bpmn_element_mappings 
ADD CONSTRAINT jira_type_check 
CHECK (jira_type IS NULL OR jira_type IN ('feature goal', 'epic'));