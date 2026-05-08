-- Battlefield map from /admin (path polyline, pads, pathCellOrder, etc.).
-- Expected JSON shape matches app `MapLayoutCloudSlice`: pathPolylineNorm, pathHalfWidthNorm,
-- placementPolygonNorm, placementPads, pathCellOrder, placementCellKeys.
-- The app may also mirror this inside user_save.state.mapLayout; this table is the durable DB surface for map-only sync.

create table public.user_map_layout (
  user_id uuid primary key references auth.users (id) on delete cascade,
  layout jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index user_map_layout_updated_at_idx on public.user_map_layout (updated_at desc);

alter table public.user_map_layout enable row level security;

create policy "user_map_layout_select_own"
  on public.user_map_layout
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_map_layout_insert_own"
  on public.user_map_layout
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_map_layout_update_own"
  on public.user_map_layout
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_user_map_layout_updated_at()
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

create trigger user_map_layout_set_updated_at
  before update on public.user_map_layout
  for each row
  execute procedure public.set_user_map_layout_updated_at();
