-- One global battlefield layout for all players (written from /admin, read on game bootstrap).
-- RLS allows anon + authenticated to read/write only row id = 'global' (hackathon-simple).

create table public.shared_battle_map (
  id text primary key check (id = 'global'),
  layout jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.shared_battle_map (id, layout)
values ('global', '{}'::jsonb)
on conflict (id) do nothing;

alter table public.shared_battle_map enable row level security;

create policy "shared_battle_map_select_all"
  on public.shared_battle_map
  for select
  to anon, authenticated
  using (true);

create policy "shared_battle_map_insert_global"
  on public.shared_battle_map
  for insert
  to anon, authenticated
  with check (id = 'global');

create policy "shared_battle_map_update_global"
  on public.shared_battle_map
  for update
  to anon, authenticated
  using (id = 'global')
  with check (id = 'global');

create or replace function public.set_shared_battle_map_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger shared_battle_map_set_updated_at
  before update on public.shared_battle_map
  for each row
  execute procedure public.set_shared_battle_map_updated_at();
