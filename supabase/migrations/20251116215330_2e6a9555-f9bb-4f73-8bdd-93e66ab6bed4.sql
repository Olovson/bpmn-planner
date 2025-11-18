-- Enable DELETE for authenticated users on dor_dod_status
-- RLS already enabled; add a permissive policy for deletes
CREATE POLICY "All authenticated users can delete status"
ON public.dor_dod_status
FOR DELETE
USING (true);
