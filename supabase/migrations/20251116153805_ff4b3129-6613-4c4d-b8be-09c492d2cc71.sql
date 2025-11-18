-- Function to automatically create versions on mapping changes
CREATE OR REPLACE FUNCTION public.auto_create_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_version_time TIMESTAMP WITH TIME ZONE;
  current_mappings JSONB;
  version_description TEXT;
BEGIN
  -- Get the timestamp of the last version created (throttle to max 1 per minute)
  SELECT created_at INTO last_version_time
  FROM public.versions
  ORDER BY created_at DESC
  LIMIT 1;

  -- Only create a new version if more than 1 minute has passed since last version
  IF last_version_time IS NULL OR (now() - last_version_time) > INTERVAL '1 minute' THEN
    
    -- Get all current mappings
    SELECT jsonb_agg(row_to_json(m.*))
    INTO current_mappings
    FROM public.bpmn_element_mappings m;

    -- Create description based on operation
    IF TG_OP = 'INSERT' THEN
      version_description := 'Auto: Added mapping for ' || NEW.element_id;
    ELSIF TG_OP = 'UPDATE' THEN
      version_description := 'Auto: Updated mapping for ' || NEW.element_id;
    ELSIF TG_OP = 'DELETE' THEN
      version_description := 'Auto: Deleted mapping for ' || OLD.element_id;
    END IF;

    -- Insert new version with current user
    INSERT INTO public.versions (user_id, description, snapshot_data)
    VALUES (
      auth.uid(),
      version_description,
      jsonb_build_object(
        'mappings', current_mappings,
        'timestamp', now()
      )
    );
  END IF;

  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers for automatic versioning
DROP TRIGGER IF EXISTS auto_version_on_insert ON public.bpmn_element_mappings;
CREATE TRIGGER auto_version_on_insert
  AFTER INSERT ON public.bpmn_element_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_version();

DROP TRIGGER IF EXISTS auto_version_on_update ON public.bpmn_element_mappings;
CREATE TRIGGER auto_version_on_update
  AFTER UPDATE ON public.bpmn_element_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_version();

DROP TRIGGER IF EXISTS auto_version_on_delete ON public.bpmn_element_mappings;
CREATE TRIGGER auto_version_on_delete
  AFTER DELETE ON public.bpmn_element_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_version();