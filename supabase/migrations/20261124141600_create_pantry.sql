create table if not exists public.pantry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id),
  name text,
  created_at timestamptz not null default now()
);

alter table public.pantry
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid,
  add column if not exists name text,
  add column if not exists created_at timestamptz;

alter table public.pantry alter column id set default gen_random_uuid();
alter table public.pantry alter column created_at set default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pantry'
      and column_name = 'ingredient'
  ) then
    execute 'update public.pantry set name = ingredient where name is null';
    execute 'alter table public.pantry alter column ingredient drop not null';
  end if;
  update public.pantry set created_at = now() where created_at is null;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.pantry'::regclass
      and contype = 'f' and confrelid = 'auth.users'::regclass
  ) then
    alter table public.pantry
      add constraint pantry_user_id_fkey
      foreign key (user_id) references auth.users (id);
  end if;
end;
$$;

alter table public.pantry enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pantry' and policyname = 'pantry_owner_select_v1') then
    create policy pantry_owner_select_v1 on public.pantry for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pantry' and policyname = 'pantry_owner_select_guard_v1') then
    create policy pantry_owner_select_guard_v1 on public.pantry as restrictive for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pantry' and policyname = 'pantry_owner_insert_v1') then
    create policy pantry_owner_insert_v1 on public.pantry for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pantry' and policyname = 'pantry_owner_insert_guard_v1') then
    create policy pantry_owner_insert_guard_v1 on public.pantry as restrictive for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pantry' and policyname = 'pantry_owner_update_v1') then
    create policy pantry_owner_update_v1 on public.pantry for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pantry' and policyname = 'pantry_owner_update_guard_v1') then
    create policy pantry_owner_update_guard_v1 on public.pantry as restrictive for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pantry' and policyname = 'pantry_owner_delete_v1') then
    create policy pantry_owner_delete_v1 on public.pantry for delete using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pantry' and policyname = 'pantry_owner_delete_guard_v1') then
    create policy pantry_owner_delete_guard_v1 on public.pantry as restrictive for delete using (auth.uid() = user_id);
  end if;
end;
$$;
