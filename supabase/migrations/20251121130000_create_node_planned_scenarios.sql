-- Planned test scenarios per node and provider

create table if not exists public.node_planned_scenarios (
  id uuid primary key default gen_random_uuid(),
  bpmn_file text not null,
  bpmn_element_id text not null,
  provider text not null,
  origin text not null,
  scenarios jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bpmn_file, bpmn_element_id, provider)
);

alter table public.node_planned_scenarios enable row level security;

create policy "Anyone can view node planned scenarios"
  on public.node_planned_scenarios
  for select
  using (true);

create policy "Service role can insert/update node planned scenarios"
  on public.node_planned_scenarios
  for insert, update
  with check (true);

create trigger update_node_planned_scenarios_updated_at
  before update on public.node_planned_scenarios
  for each row
  execute function public.update_updated_at_column();

create index if not exists idx_node_planned_scenarios_node
  on public.node_planned_scenarios (bpmn_file, bpmn_element_id);

