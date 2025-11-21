-- Add mode column to node_test_links to support per-mode test artifacts (local/fast/slow)

alter table public.node_test_links
  add column if not exists mode text;

