create table if not exists public.pantry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ingredient text not null
);

-- Match application normalization by collapsing internal whitespace before
-- keeping the pantry row with the smallest UUID for each user and ingredient.
with ranked_pantry as (
  select
    id,
    row_number() over (
      partition by user_id,
        lower(trim(regexp_replace(ingredient, '[[:space:]]+', ' ', 'g')))
      order by id
    ) as duplicate_rank
  from public.pantry
)
delete from public.pantry as pantry
using ranked_pantry
where pantry.id = ranked_pantry.id
  and ranked_pantry.duplicate_rank > 1;

create unique index if not exists pantry_user_ingredient_normalized_uidx
  on public.pantry (
    user_id,
    lower(trim(regexp_replace(ingredient, '[[:space:]]+', ' ', 'g')))
  );

alter table public.pantry enable row level security;

-- Restrictive guards keep pre-existing permissive policies from widening access.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pantry'
      and policyname = 'pantry_owner_select_v1'
  ) then
    create policy pantry_owner_select_v1
      on public.pantry for select
      using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pantry'
      and policyname = 'pantry_owner_select_guard_v1'
  ) then
    create policy pantry_owner_select_guard_v1
      on public.pantry as restrictive for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pantry'
      and policyname = 'pantry_owner_insert_v1'
  ) then
    create policy pantry_owner_insert_v1
      on public.pantry for insert
      with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pantry'
      and policyname = 'pantry_owner_insert_guard_v1'
  ) then
    create policy pantry_owner_insert_guard_v1
      on public.pantry as restrictive for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pantry'
      and policyname = 'pantry_owner_update_v1'
  ) then
    create policy pantry_owner_update_v1
      on public.pantry for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pantry'
      and policyname = 'pantry_owner_update_guard_v1'
  ) then
    create policy pantry_owner_update_guard_v1
      on public.pantry as restrictive for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pantry'
      and policyname = 'pantry_owner_delete_v1'
  ) then
    create policy pantry_owner_delete_v1
      on public.pantry for delete
      using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pantry'
      and policyname = 'pantry_owner_delete_guard_v1'
  ) then
    create policy pantry_owner_delete_guard_v1
      on public.pantry as restrictive for delete
      using (auth.uid() = user_id);
  end if;
end;
$$;
