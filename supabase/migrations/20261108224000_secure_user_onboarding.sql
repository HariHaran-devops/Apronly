
-- ============================================================
-- APRONLY
-- MIGRATION: Secure user onboarding
--
-- PURPOSE:
--   1. Allow authenticated candidates to complete onboarding.
--   2. Allow authenticated users to submit a restaurant application.
--   3. Assign only the specific roles required by each workflow.
--   4. Prevent duplicate restaurant applications.
--   5. Record onboarding actions in the audit log.
--   6. Keep onboarding operations unavailable to anonymous users.
--
-- SECURITY:
--   User identity is always derived from auth.uid().
--   No user-supplied role or user ID is accepted.
--   Functions use SECURITY DEFINER with an empty search_path.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. PRIVATE RESTAURANT ONBOARDING TRACKER
-- ------------------------------------------------------------

-- One initial restaurant application per authenticated user.
-- This prevents duplicate restaurant creation on retries.
-- This table is intentionally inaccessible to application clients.

create table public.restaurant_onboarding_requests (
  user_id uuid primary key
    references public.profiles(id) on delete cascade,

  restaurant_id uuid not null unique
    references public.restaurants(id) on delete cascade,

  created_at timestamptz not null default now()
);

alter table public.restaurant_onboarding_requests
  enable row level security;

revoke all privileges
on public.restaurant_onboarding_requests
from public, anon, authenticated;


-- ------------------------------------------------------------
-- 2. CANDIDATE ONBOARDING
-- ------------------------------------------------------------

create or replace function public.complete_candidate_onboarding(
  p_city text,
  p_preferred_cities text[] default '{}',
  p_skills text[] default '{}',
  p_experience_years numeric default 0,
  p_current_position text default null,
  p_employment_status text default null,
  p_bio text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
begin
  -- Only an authenticated user can complete onboarding.
  current_user_id := (select auth.uid());

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Validate the required candidate city.
  if p_city is null
     or char_length(btrim(p_city)) < 2
     or char_length(btrim(p_city)) > 100 then
    raise exception 'A valid city is required';
  end if;

  -- Validate experience.
  if p_experience_years is null
     or p_experience_years < 0
     or p_experience_years > 80 then
    raise exception 'Invalid experience value';
  end if;

  -- Limit submitted arrays.
  if coalesce(cardinality(p_preferred_cities), 0) > 20
     or coalesce(cardinality(p_skills), 0) > 50 then
    raise exception 'Too many onboarding values supplied';
  end if;

  -- Ensure the authenticated identity has a profile.
  if not exists (
    select 1
    from public.profiles p
    where p.id = current_user_id
  ) then
    raise exception 'Account profile not found';
  end if;

  -- Create or update only the caller's candidate profile.
  insert into public.candidate_profiles (
    id,
    city,
    preferred_cities,
    skills,
    experience_years,
    current_position,
    employment_status,
    bio
  )
  values (
    current_user_id,
    btrim(p_city),
    coalesce(p_preferred_cities, '{}'),
    coalesce(p_skills, '{}'),
    p_experience_years,
    nullif(btrim(p_current_position), ''),
    nullif(btrim(p_employment_status), ''),
    nullif(btrim(p_bio), '')
  )
  on conflict (id)
  do update set
    city = excluded.city,
    preferred_cities = excluded.preferred_cities,
    skills = excluded.skills,
    experience_years = excluded.experience_years,
    current_position = excluded.current_position,
    employment_status = excluded.employment_status,
    bio = excluded.bio;

  -- Assign only the candidate role to the authenticated user.
  insert into public.user_roles (
    user_id,
    role,
    assigned_by
  )
  values (
    current_user_id,
    'candidate'::public.app_role,
    null
  )
  on conflict (user_id, role) do nothing;

  -- Record the onboarding operation.
  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    current_user_id,
    'candidate_onboarding_completed',
    'candidate_profile',
    current_user_id::text,
    jsonb_build_object(
      'city', btrim(p_city)
    )
  );

  return current_user_id;
end;
$$;


-- ------------------------------------------------------------
-- 3. RESTAURANT APPLICATION SUBMISSION
-- ------------------------------------------------------------

create or replace function public.submit_restaurant_application(
  p_name text,
  p_city text,
  p_legal_name text default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  existing_restaurant_id uuid;
  new_restaurant_id uuid;
  generated_slug text;
  clean_name text;
  clean_city text;
begin
  -- Derive identity from the authenticated session.
  current_user_id := (select auth.uid());

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Normalize and validate restaurant name.
  clean_name := btrim(coalesce(p_name, ''));
  clean_city := btrim(coalesce(p_city, ''));

  if char_length(clean_name) < 2
     or char_length(clean_name) > 200 then
    raise exception 'Restaurant name must be between 2 and 200 characters';
  end if;

  if char_length(clean_city) < 2
     or char_length(clean_city) > 100 then
    raise exception 'A valid restaurant city is required';
  end if;

  if p_legal_name is not null
     and char_length(btrim(p_legal_name)) > 200 then
    raise exception 'Legal name is too long';
  end if;

  if p_description is not null
     and char_length(btrim(p_description)) > 2000 then
    raise exception 'Description is too long';
  end if;

  -- Ensure the authenticated identity has a profile.
  if not exists (
    select 1
    from public.profiles p
    where p.id = current_user_id
  ) then
    raise exception 'Account profile not found';
  end if;

  -- Serialize initial submissions for this authenticated user.
  -- Concurrent retries wait until the first transaction finishes.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  -- Return the existing application if this is a retry.
  select r.restaurant_id
  into existing_restaurant_id
  from public.restaurant_onboarding_requests r
  where r.user_id = current_user_id;

  if existing_restaurant_id is not null then
    return existing_restaurant_id;
  end if;

  -- Generate a unique, URL-safe restaurant slug.
  generated_slug := lower(
    regexp_replace(
      clean_name,
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    )
  );

  generated_slug := regexp_replace(
    generated_slug,
    '(^-+|-+$)',
    '',
    'g'
  );

  if generated_slug = '' then
    generated_slug := 'restaurant';
  end if;

  generated_slug :=
    left(generated_slug, 80)
    || '-'
    || left(
      replace(gen_random_uuid()::text, '-', ''),
      8
    );

  -- Create the restaurant in a pending, unverified state.
  insert into public.restaurants (
    name,
    legal_name,
    slug,
    description,
    city,
    verification_status,
    status
  )
  values (
    clean_name,
    nullif(btrim(p_legal_name), ''),
    generated_slug,
    nullif(btrim(p_description), ''),
    clean_city,
    'unverified'::public.verification_status,
    'pending'::public.restaurant_status
  )
  returning id into new_restaurant_id;

  -- Create the initial owner membership.
  -- Active membership permits access to the restricted
  -- application workspace, not verification or approval.
  insert into public.restaurant_memberships (
    restaurant_id,
    user_id,
    role,
    status,
    invited_by
  )
  values (
    new_restaurant_id,
    current_user_id,
    'owner'::public.restaurant_member_role,
    'active'::public.membership_status,
    null
  );

  -- Assign only the restaurant_staff application role.
  insert into public.user_roles (
    user_id,
    role,
    assigned_by
  )
  values (
    current_user_id,
    'restaurant_staff'::public.app_role,
    null
  )
  on conflict (user_id, role) do nothing;

  -- Store the initial application to prevent duplicate creation.
  insert into public.restaurant_onboarding_requests (
    user_id,
    restaurant_id
  )
  values (
    current_user_id,
    new_restaurant_id
  );

  -- Record the application submission.
  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    current_user_id,
    'restaurant_application_submitted',
    'restaurant',
    new_restaurant_id::text,
    jsonb_build_object(
      'restaurant_name', clean_name,
      'city', clean_city,
      'status', 'pending'
    )
  );

  return new_restaurant_id;
end;
$$;


-- ------------------------------------------------------------
-- 4. FUNCTION EXECUTION PERMISSIONS
-- ------------------------------------------------------------

-- Remove default PUBLIC and anonymous execution.
revoke all on function
  public.complete_candidate_onboarding(
    text, text[], text[], numeric, text, text, text
  )
from public, anon, authenticated;

revoke all on function
  public.submit_restaurant_application(
    text, text, text, text
  )
from public, anon, authenticated;

-- Only authenticated users can invoke these operations.
grant execute on function
  public.complete_candidate_onboarding(
    text, text[], text[], numeric, text, text, text
  )
to authenticated;

grant execute on function
  public.submit_restaurant_application(
    text, text, text, text
  )
to authenticated;


-- ------------------------------------------------------------
-- 5. DOCUMENT FUNCTION PURPOSES
-- ------------------------------------------------------------

comment on function public.complete_candidate_onboarding(
  text, text[], text[], numeric, text, text, text
) is
'Creates or updates the authenticated users candidate profile and assigns only the candidate role.';

comment on function public.submit_restaurant_application(
  text, text, text, text
) is
'Creates one pending restaurant application for the authenticated user, including owner membership and restaurant_staff role.';

comment on table public.restaurant_onboarding_requests is
'Private idempotency records for initial restaurant onboarding submissions. Not accessible directly to application clients.';

commit;
