-- ============================================================
-- APRONLY: HARDEN CANDIDATE ONBOARDING
-- Preserve the existing RPC contract and role assignment.
-- ============================================================

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
  normalized_city text;
  normalized_preferred_cities text[];
  normalized_skills text[];
  normalized_position text;
  normalized_employment_status text;
  normalized_bio text;
begin
  -- Derive identity exclusively from the authenticated session.
  current_user_id := (select auth.uid());

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Normalize and validate current city.
  normalized_city := regexp_replace(
    btrim(p_city),
    '\s+',
    ' ',
    'g'
  );

  if normalized_city is null
     or char_length(normalized_city) < 2
     or char_length(normalized_city) > 100 then
    raise exception 'A valid city is required';
  end if;

  -- Validate experience.
  if p_experience_years is null
     or p_experience_years < 0
     or p_experience_years > 80 then
    raise exception 'Experience must be between 0 and 80 years';
  end if;

  -- Validate preferred city count.
  if coalesce(cardinality(p_preferred_cities), 0) > 20 then
    raise exception 'You can add up to 20 preferred cities';
  end if;

  -- Validate every preferred city.
  if exists (
    select 1
    from unnest(coalesce(p_preferred_cities, array[]::text[]))
      as item(city_value)
    where city_value is null
       or char_length(btrim(city_value)) < 2
       or char_length(btrim(city_value)) > 100
  ) then
    raise exception 'Each preferred city must contain 2 to 100 characters';
  end if;

  -- Validate skill count.
  if coalesce(cardinality(p_skills), 0) > 50 then
    raise exception 'You can add up to 50 skills';
  end if;

  -- Validate every skill.
  if exists (
    select 1
    from unnest(coalesce(p_skills, array[]::text[]))
      as item(skill_value)
    where skill_value is null
       or char_length(btrim(skill_value)) < 1
       or char_length(btrim(skill_value)) > 80
  ) then
    raise exception 'Each skill must contain 1 to 80 characters';
  end if;

  -- Validate current or last position.
  normalized_position := nullif(
    regexp_replace(btrim(p_current_position), '\s+', ' ', 'g'),
    ''
  );

  if normalized_position is not null
     and char_length(normalized_position) > 150 then
    raise exception 'Current position must be 150 characters or fewer';
  end if;

  -- Preserve the employment status values used by the existing UI.
  normalized_employment_status := nullif(
    btrim(p_employment_status),
    ''
  );

  if normalized_employment_status is not null
     and normalized_employment_status not in (
       'Currently employed',
       'Open to opportunities',
       'Not currently employed',
       'Student',
       'Freelancer'
     ) then
    raise exception 'Invalid employment status';
  end if;

  -- Validate introduction.
  normalized_bio := nullif(btrim(p_bio), '');

  if normalized_bio is not null
     and char_length(normalized_bio) > 1000 then
    raise exception 'Introduction must be 1000 characters or fewer';
  end if;

  -- Normalize arrays while preserving their submitted order.
  select coalesce(
    array_agg(
      regexp_replace(btrim(city_value), '\s+', ' ', 'g')
      order by position
    ),
    array[]::text[]
  )
  into normalized_preferred_cities
  from unnest(coalesce(p_preferred_cities, array[]::text[]))
    with ordinality as item(city_value, position);

  select coalesce(
    array_agg(
      regexp_replace(btrim(skill_value), '\s+', ' ', 'g')
      order by position
    ),
    array[]::text[]
  )
  into normalized_skills
  from unnest(coalesce(p_skills, array[]::text[]))
    with ordinality as item(skill_value, position);

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
    normalized_city,
    normalized_preferred_cities,
    normalized_skills,
    p_experience_years,
    normalized_position,
    normalized_employment_status,
    normalized_bio
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

  -- Assign only the candidate role.
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
      'city', normalized_city
    )
  );

  return current_user_id;
end;
$$;

-- Explicitly preserve authenticated-only execution.
revoke all on function public.complete_candidate_onboarding(
  text, text[], text[], numeric, text, text, text
) from public, anon, authenticated;

grant execute on function public.complete_candidate_onboarding(
  text, text[], text[], numeric, text, text, text
) to authenticated;

comment on function public.complete_candidate_onboarding(
  text, text[], text[], numeric, text, text, text
) is
'Creates or updates the authenticated users candidate profile, validates submitted fields, and assigns only the candidate role.';

-- ============================================================
-- END OF MIGRATION
-- ============================================================