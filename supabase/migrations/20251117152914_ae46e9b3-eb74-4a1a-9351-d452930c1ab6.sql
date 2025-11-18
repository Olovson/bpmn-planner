-- Fix trigger on bpmn_files that referenced non-existent updated_at column
-- Create a function that updates last_updated_at instead
CREATE OR REPLACE FUNCTION public.update_last_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Remove incorrect trigger that set NEW.updated_at on bpmn_files
DROP TRIGGER IF EXISTS update_bpmn_files_updated_at ON public.bpmn_files;

-- Create correct trigger to update NEW.last_updated_at on updates
CREATE TRIGGER update_bpmn_files_last_updated_at
BEFORE UPDATE ON public.bpmn_files
FOR EACH ROW
EXECUTE FUNCTION public.update_last_updated_at_column();