-- Fix auto_create_version trigger to handle NULL or invalid user_id
-- This prevents foreign key constraint errors when user session is invalid

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
  current_user_id UUID;
BEGIN
  -- Get current user ID, but handle NULL gracefully
  current_user_id := auth.uid();
  
  -- If user_id is NULL or doesn't exist in users table, skip version creation
  -- This can happen after database reset when user session is invalid
  IF current_user_id IS NULL THEN
    -- No user session - skip version creation
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  -- Verify user exists in auth.users (prevent foreign key constraint error)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = current_user_id) THEN
    -- User doesn't exist - skip version creation
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

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

    -- Insert new version with current user (only if user exists)
    INSERT INTO public.versions (user_id, description, snapshot_data)
    VALUES (
      current_user_id,
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
