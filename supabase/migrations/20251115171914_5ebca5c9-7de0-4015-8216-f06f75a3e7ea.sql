-- Drop existing constraints and policies
ALTER TABLE public.bpmn_element_mappings DROP CONSTRAINT IF EXISTS bpmn_element_mappings_user_id_bpmn_file_element_id_key;

DROP POLICY IF EXISTS "Users can view their own mappings" ON public.bpmn_element_mappings;
DROP POLICY IF EXISTS "Users can insert their own mappings" ON public.bpmn_element_mappings;
DROP POLICY IF EXISTS "Users can update their own mappings" ON public.bpmn_element_mappings;
DROP POLICY IF EXISTS "Users can delete their own mappings" ON public.bpmn_element_mappings;

-- Remove user_id column
ALTER TABLE public.bpmn_element_mappings DROP COLUMN user_id;

-- Add new unique constraint without user_id
ALTER TABLE public.bpmn_element_mappings ADD CONSTRAINT bpmn_element_mappings_bpmn_file_element_id_key UNIQUE(bpmn_file, element_id);

-- Create new RLS policies that allow all authenticated users to access all mappings
CREATE POLICY "All authenticated users can view mappings"
  ON public.bpmn_element_mappings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert mappings"
  ON public.bpmn_element_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update mappings"
  ON public.bpmn_element_mappings
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can delete mappings"
  ON public.bpmn_element_mappings
  FOR DELETE
  TO authenticated
  USING (true);