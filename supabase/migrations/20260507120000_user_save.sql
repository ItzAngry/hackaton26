-- Per-user JSON save for game + onboarding (synced from the app).
create table public.user_save (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index user_save_updated_at_idx on public.user_save (updated_at desc);

alter table public.user_save enable row level security;

create policy "user_save_select_own"
  on public.user_save
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_save_insert_own"
  on public.user_save
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_save_update_own"
  on public.user_save
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_user_save_updated_at()
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

create trigger user_save_set_updated_at
  before update on public.user_save
  for each row
  execute procedure public.set_user_save_updated_at();
