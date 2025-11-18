-- Ensure unique identity for upserts of DoR/DoD criteria
CREATE UNIQUE INDEX IF NOT EXISTS idx_dor_dod_unique
ON public.dor_dod_status (subprocess_name, criterion_type, criterion_key);

-- Enable realtime to receive row payloads on updates
ALTER TABLE public.dor_dod_status REPLICA IDENTITY FULL;

-- Add table to realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'dor_dod_status'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.dor_dod_status';
  END IF;
END
$$;