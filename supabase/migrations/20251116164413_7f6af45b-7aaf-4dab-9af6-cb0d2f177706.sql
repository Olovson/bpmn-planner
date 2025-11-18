-- Create trigger function for DoR/DoD version tracking
CREATE OR REPLACE FUNCTION public.auto_create_dor_dod_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  last_version_time TIMESTAMP WITH TIME ZONE;
  version_description TEXT;
BEGIN
  -- Get the timestamp of the last version created (throttle to max 1 per minute)
  SELECT created_at INTO last_version_time
  FROM public.versions
  ORDER BY created_at DESC
  LIMIT 1;

  -- Only create a new version if more than 1 minute has passed since last version
  IF last_version_time IS NULL OR (now() - last_version_time) > INTERVAL '1 minute' THEN
    
    -- Create description based on operation
    IF TG_OP = 'UPDATE' THEN
      IF NEW.is_completed AND NOT OLD.is_completed THEN
        version_description := 'DoR/DoD: Completed "' || NEW.criterion_text || '" for ' || NEW.subprocess_name;
      ELSIF NOT NEW.is_completed AND OLD.is_completed THEN
        version_description := 'DoR/DoD: Uncompleted "' || NEW.criterion_text || '" for ' || NEW.subprocess_name;
      ELSE
        version_description := 'DoR/DoD: Updated criterion for ' || NEW.subprocess_name;
      END IF;
    ELSIF TG_OP = 'INSERT' THEN
      version_description := 'DoR/DoD: Initialized criteria for ' || NEW.subprocess_name;
    END IF;

    -- Insert new version with current user
    IF auth.uid() IS NOT NULL THEN
      INSERT INTO public.versions (user_id, description, snapshot_data)
      VALUES (
        auth.uid(),
        version_description,
        jsonb_build_object(
          'type', 'dor_dod_change',
          'subprocess_name', NEW.subprocess_name,
          'criterion_type', NEW.criterion_type,
          'criterion_category', NEW.criterion_category,
          'criterion_key', NEW.criterion_key,
          'is_completed', NEW.is_completed,
          'timestamp', now()
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for DoR/DoD changes
DROP TRIGGER IF EXISTS dor_dod_version_tracking ON public.dor_dod_status;
CREATE TRIGGER dor_dod_version_tracking
AFTER INSERT OR UPDATE ON public.dor_dod_status
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_dor_dod_version();