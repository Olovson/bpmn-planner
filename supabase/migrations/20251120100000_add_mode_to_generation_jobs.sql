-- Add mode column to generation_jobs to track generation mode (local/fast/slow)

alter table public.generation_jobs
  add column if not exists mode text;

