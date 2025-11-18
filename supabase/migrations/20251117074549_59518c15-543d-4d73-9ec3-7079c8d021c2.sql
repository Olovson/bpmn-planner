-- Add sha column to track GitHub file versions
ALTER TABLE public.bpmn_files 
ADD COLUMN IF NOT EXISTS sha text;