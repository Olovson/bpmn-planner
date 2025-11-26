-- Create table for per-node integration overrides
create table if not exists public.integration_overrides (
  bpmn_file text not null,
  element_id text not null,
  uses_stacc_integration boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_overrides_pkey primary key (bpmn_file, element_id)
);

-- Simple updated_at trigger
create or replace function public.set_integration_overrides_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_integration_overrides_updated_at on public.integration_overrides;

create trigger set_integration_overrides_updated_at
before update on public.integration_overrides
for each row
execute function public.set_integration_overrides_updated_at();

-- Enable RLS
alter table public.integration_overrides enable row level security;

-- Allow authenticated users to manage overrides
create policy "Authenticated users can manage integration_overrides"
  on public.integration_overrides
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);


