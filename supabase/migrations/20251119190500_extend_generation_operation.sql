do $$
begin
  alter type public.generation_operation add value if not exists 'local_generation';
  alter type public.generation_operation add value if not exists 'llm_generation';
exception
  when duplicate_object then null;
end $$;
