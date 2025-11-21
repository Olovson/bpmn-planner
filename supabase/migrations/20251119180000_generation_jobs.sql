-- Generation jobs tracking
create type public.generation_operation as enum ('hierarchy','generation');
create type public.generation_status as enum ('pending','running','succeeded','failed');

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  operation public.generation_operation not null,
  status public.generation_status not null default 'pending',
  progress integer,
  total integer,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid references auth.users(id)
);

create trigger update_generation_jobs_updated_at
  before update on public.generation_jobs
  for each row
  execute function public.update_updated_at_column();

alter table public.generation_jobs enable row level security;

create policy "Generation jobs are viewable by authenticated users"
  on public.generation_jobs for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert generation jobs"
  on public.generation_jobs for insert
  with check (auth.uid() is not null);

create policy "Job owners can update their jobs"
  on public.generation_jobs for update
  using (auth.uid() = created_by);

create index if not exists idx_generation_jobs_status
  on public.generation_jobs (status);

create index if not exists idx_generation_jobs_created_at
  on public.generation_jobs (created_at desc);
