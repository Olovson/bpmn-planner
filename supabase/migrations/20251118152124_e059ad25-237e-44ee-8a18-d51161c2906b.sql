-- Add meta JSONB column to bpmn_files table for storing parsed BpmnMeta
ALTER TABLE public.bpmn_files
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT NULL;