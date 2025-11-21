create table if not exists public.llm_generation_logs (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  event_type text not null,
  doc_type text,
  node_id text,
  node_name text,
  bpmn_file text,
  status text not null,
  reason text not null,
  error_message text,
  metadata jsonb
);

create index if not exists idx_llm_generation_logs_event_type
  on public.llm_generation_logs (event_type);

create index if not exists idx_llm_generation_logs_created_at
  on public.llm_generation_logs (created_at desc);
