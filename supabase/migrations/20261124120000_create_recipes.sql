create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  title text not null,
  ingredients text[] not null default '{}'::text[],
  instructions text not null default ''::text,
  minutes integer,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  description text default ''::text
);

alter table public.recipes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recipes'
      and policyname = 'recipes_owner_select_v1'
  ) then
    create policy recipes_owner_select_v1 on public.recipes
      for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recipes'
      and policyname = 'recipes_owner_insert_v1'
  ) then
    create policy recipes_owner_insert_v1 on public.recipes
      for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recipes'
      and policyname = 'recipes_owner_update_v1'
  ) then
    create policy recipes_owner_update_v1 on public.recipes
      for update using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recipes'
      and policyname = 'recipes_owner_delete_v1'
  ) then
    create policy recipes_owner_delete_v1 on public.recipes
      for delete using (auth.uid() = user_id);
  end if;
end;
$$;
