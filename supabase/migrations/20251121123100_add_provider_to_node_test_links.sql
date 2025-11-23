-- Add provider column to node_test_links to track which LLM/local variant generated the test script

alter table public.node_test_links
  add column if not exists provider text;

