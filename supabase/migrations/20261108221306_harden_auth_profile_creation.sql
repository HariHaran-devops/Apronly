
-- ============================================================
-- APRONLY
-- MIGRATION: Harden automatic Auth profile creation
-- PURPOSE:
--   1. Safely normalize signup names.
--   2. Enforce the profiles.full_name 150-character limit.
--   3. Keep profile creation restricted to the Auth trigger.
-- ============================================================

begin;

-- Replace the existing profile creation function.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  supplied_name text;
begin
  -- Read the name supplied through Supabase Auth metadata.
  supplied_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name'
  );

  -- Normalize whitespace and safely enforce the column limit.
  supplied_name := nullif(
    left(
      regexp_replace(
        coalesce(supplied_name, ''),
        '\s+',
        ' ',
        'g'
      ),
      150
    ),
    ''
  );

  -- Create the profile for the new Auth identity.
  insert into public.profiles (
    id,
    full_name
  )
  values (
    new.id,
    supplied_name
  );

  return new;
end;
$$;

-- The function is intended to be invoked by its Auth trigger,
-- not directly by ordinary application users.
revoke all on function public.handle_new_user()
from public, anon, authenticated;

commit;
