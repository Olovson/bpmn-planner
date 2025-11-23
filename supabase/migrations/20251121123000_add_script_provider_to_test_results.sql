-- Add script_mode and script_provider columns to test_results

alter table public.test_results
  add column if not exists script_mode text;

alter table public.test_results
  add column if not exists script_provider text;

