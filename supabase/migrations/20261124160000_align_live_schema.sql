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

drop trigger if exists recipes_set_updated_at on public.recipes;

alter table public.recipes
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid default auth.uid(),
  add column if not exists title text,
  add column if not exists ingredients text[] default '{}'::text[],
  add column if not exists instructions text,
  add column if not exists minutes integer,
  add column if not exists favorite boolean,
  add column if not exists created_at timestamptz default now(),
  add column if not exists description text default ''::text;

do $$
declare
  ingredients_type text;
  ingredients_udt text;
  has_cascade_user_fk boolean;
  constraint_row record;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'recipes'
      and column_name = 'steps'
  ) then
    execute $migration$
      update public.recipes
      set instructions = steps::text
      where (instructions is null or instructions = '')
        and steps is not null
    $migration$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'recipes'
      and column_name = 'is_favorite'
  ) then
    execute 'update public.recipes set favorite = is_favorite where favorite is null';
  end if;
  update public.recipes set instructions = '' where instructions is null;
  update public.recipes set favorite = false where favorite is null;
  update public.recipes set created_at = now() where created_at is null;

  select data_type, udt_name into ingredients_type, ingredients_udt
  from information_schema.columns
  where table_schema = 'public' and table_name = 'recipes'
    and column_name = 'ingredients';

  if ingredients_type = 'ARRAY' and ingredients_udt <> '_text' then
    alter table public.recipes alter column ingredients drop default;
    alter table public.recipes alter column ingredients type text[]
      using ingredients::text[];
  elsif ingredients_type in ('text', 'character varying', 'character') then
    alter table public.recipes alter column ingredients drop default;
    alter table public.recipes alter column ingredients type text[]
      using case
        when ingredients is null or ingredients::text = '' then '{}'::text[]
        else string_to_array(ingredients::text, E'\n')
      end;
  elsif ingredients_type <> 'ARRAY' or ingredients_udt <> '_text' then
    raise exception 'Unsupported public.recipes.ingredients data type: %',
      ingredients_type;
  end if;
  update public.recipes set ingredients = '{}'::text[] where ingredients is null;

  select exists (
    select 1
    from pg_constraint fk
    join pg_attribute att
      on att.attrelid = fk.conrelid and att.attnum = any(fk.conkey)
    where fk.conrelid = 'public.recipes'::regclass
      and fk.contype = 'f'
      and fk.confrelid = 'auth.users'::regclass
      and att.attname = 'user_id'
      and fk.confdeltype = 'c'
  ) into has_cascade_user_fk;

  if not has_cascade_user_fk then
    for constraint_row in
      select conname
      from pg_constraint fk
      join pg_attribute att
        on att.attrelid = fk.conrelid and att.attnum = any(fk.conkey)
      where fk.conrelid = 'public.recipes'::regclass
        and fk.contype = 'f'
        and fk.confrelid = 'auth.users'::regclass
        and att.attname = 'user_id'
    loop
      execute format('alter table public.recipes drop constraint %I', constraint_row.conname);
    end loop;
    alter table public.recipes
      add constraint recipes_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from public.recipes where id is null) then
    update public.recipes set id = gen_random_uuid() where id is null;
  end if;
  if exists (select 1 from public.recipes where user_id is null) then
    raise exception 'Cannot enforce recipes.user_id NOT NULL while ownerless rows exist';
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.recipes'::regclass and contype = 'p'
  ) then
    alter table public.recipes add constraint recipes_pkey primary key (id);
  end if;
end;
$$;

alter table public.recipes
  alter column id set default gen_random_uuid(),
  alter column user_id set default auth.uid(),
  alter column user_id set not null,
  alter column title set not null,
  alter column ingredients set default '{}'::text[],
  alter column ingredients set not null,
  alter column instructions set default ''::text,
  alter column instructions set not null,
  alter column favorite set default false,
  alter column favorite set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column description set default ''::text;

alter table public.recipes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'recipes' and policyname = 'recipes_owner_select_v1') then
    create policy recipes_owner_select_v1 on public.recipes for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'recipes' and policyname = 'recipes_owner_select_guard_v1') then
    create policy recipes_owner_select_guard_v1 on public.recipes as restrictive for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'recipes' and policyname = 'recipes_owner_insert_v1') then
    create policy recipes_owner_insert_v1 on public.recipes for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'recipes' and policyname = 'recipes_owner_insert_guard_v1') then
    create policy recipes_owner_insert_guard_v1 on public.recipes as restrictive for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'recipes' and policyname = 'recipes_owner_update_v1') then
    create policy recipes_owner_update_v1 on public.recipes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'recipes' and policyname = 'recipes_owner_update_guard_v1') then
    create policy recipes_owner_update_guard_v1 on public.recipes as restrictive for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'recipes' and policyname = 'recipes_owner_delete_v1') then
    create policy recipes_owner_delete_v1 on public.recipes for delete using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'recipes' and policyname = 'recipes_owner_delete_guard_v1') then
    create policy recipes_owner_delete_guard_v1 on public.recipes as restrictive for delete using (auth.uid() = user_id);
  end if;
end;
$$;

create table if not exists public.pantry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id),
  name text,
  created_at timestamptz not null default now()
);

alter table public.pantry
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid default auth.uid(),
  add column if not exists name text,
  add column if not exists created_at timestamptz default now();

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

alter table public.pantry
  alter column id set default gen_random_uuid(),
  alter column user_id set default auth.uid(),
  alter column created_at set default now(),
  alter column created_at set not null;

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
