-- Add jira_name column to bpmn_element_mappings table
ALTER TABLE public.bpmn_element_mappings 
ADD COLUMN IF NOT EXISTS jira_name TEXT;