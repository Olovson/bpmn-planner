-- Add policies for authenticated users to insert/update node_planned_scenarios
-- This allows client-side code (using user session) to save planned scenarios

-- Allow authenticated users to insert planned scenarios
CREATE POLICY "Authenticated users can insert node planned scenarios"
  ON public.node_planned_scenarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update planned scenarios
CREATE POLICY "Authenticated users can update node planned scenarios"
  ON public.node_planned_scenarios
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

