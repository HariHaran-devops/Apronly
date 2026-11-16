-- ============================================================
-- APRONLY: ADMIN CANDIDATE SEARCH
-- Full operational candidate access for authorized admins.
-- Restaurant disclosure remains controlled by the release flow.
-- ============================================================

-- Retain the experience index for filtering and sorting.
create index if not exists candidate_profiles_experience_idx
  on public.candidate_profiles (experience_years);

create or replace function public.admin_search_candidates(
  p_search text default null,
  p_city text default null,
  p_skill text default null,
  p_min_experience numeric default null,
  p_max_experience numeric default null,
  p_employment_status text default null,
  p_preferred_role text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  candidate_id uuid,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  account_status public.account_status,
  verification_status public.verification_status,
  bio text,
  city text,
  preferred_cities text[],
  skills text[],
  experience_years numeric,
  current_position text,
  employment_status text,
  job_preferences jsonb,
  languages jsonb,
  employment_history jsonb,
  documents jsonb,
  profile_created_at timestamptz,
  profile_updated_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required'
      using errcode = '42501';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Limit must be between 1 and 100'
      using errcode = '22023';
  end if;

  if p_offset is null or p_offset < 0 then
    raise exception 'Offset cannot be negative'
      using errcode = '22023';
  end if;

  if p_min_experience is not null and p_min_experience < 0 then
    raise exception 'Minimum experience cannot be negative'
      using errcode = '22023';
  end if;

  if p_max_experience is not null and p_max_experience < 0 then
    raise exception 'Maximum experience cannot be negative'
      using errcode = '22023';
  end if;

  if p_min_experience is not null
     and p_max_experience is not null
     and p_min_experience > p_max_experience then
    raise exception 'Minimum experience cannot exceed maximum experience'
      using errcode = '22023';
  end if;

  if char_length(coalesce(p_search, '')) > 150
     or char_length(coalesce(p_city, '')) > 100
     or char_length(coalesce(p_skill, '')) > 100
     or char_length(coalesce(p_employment_status, '')) > 100
     or char_length(coalesce(p_preferred_role, '')) > 150 then
    raise exception 'A search filter exceeds its maximum length'
      using errcode = '22023';
  end if;

  return query
  with filtered_candidates as (
    select
      cp.id,
      pr.full_name,
      au.email::text as candidate_email,
      pr.phone,
      pr.avatar_url,
      pr.account_status,
      pr.verification_status,
      cp.bio,
      cp.city,
      cp.preferred_cities,
      cp.skills,
      cp.experience_years,
      cp.current_position,
      cp.employment_status,
      cp.created_at,
      cp.updated_at
    from public.candidate_profiles cp
    join public.profiles pr
      on pr.id = cp.id
    join auth.users au
      on au.id = cp.id
    where
      pr.account_status = 'active'
      and exists (
        select 1
        from public.user_roles ur
        where ur.user_id = cp.id
          and ur.role = 'candidate'
      )
      and (
        nullif(trim(p_search), '') is null
        or pr.full_name ilike '%' || trim(p_search) || '%'
        or au.email ilike '%' || trim(p_search) || '%'
        or pr.phone ilike '%' || trim(p_search) || '%'
        or cp.current_position ilike '%' || trim(p_search) || '%'
        or exists (
          select 1
          from unnest(cp.skills) as s(skill)
          where s.skill ilike '%' || trim(p_search) || '%'
        )
      )
      and (
        nullif(trim(p_city), '') is null
        or cp.city ilike '%' || trim(p_city) || '%'
        or exists (
          select 1
          from unnest(cp.preferred_cities) as c(city)
          where c.city ilike '%' || trim(p_city) || '%'
        )
      )
      and (
        nullif(trim(p_skill), '') is null
        or exists (
          select 1
          from unnest(cp.skills) as s(skill)
          where s.skill ilike '%' || trim(p_skill) || '%'
        )
      )
      and (
        p_min_experience is null
        or cp.experience_years >= p_min_experience
      )
      and (
        p_max_experience is null
        or cp.experience_years <= p_max_experience
      )
      and (
        nullif(trim(p_employment_status), '') is null
        or cp.employment_status ilike trim(p_employment_status)
      )
      and (
        nullif(trim(p_preferred_role), '') is null
        or exists (
          select 1
          from public.candidate_job_preferences jp
          cross join lateral unnest(jp.preferred_roles) as r(role)
          where jp.candidate_id = cp.id
            and r.role ilike '%' || trim(p_preferred_role) || '%'
        )
      )
  ),
  counted_candidates as (
    select
      fc.*,
      count(*) over () as result_count
    from filtered_candidates fc
  )
  select
    cc.id,
    cc.full_name,
    cc.candidate_email,
    cc.phone,
    cc.avatar_url,
    cc.account_status,
    cc.verification_status,
    cc.bio,
    cc.city,
    cc.preferred_cities,
    cc.skills,
    cc.experience_years,
    cc.current_position,
    cc.employment_status,

    coalesce(
      (
        select jsonb_build_object(
          'preferred_roles', jp.preferred_roles,
          'preferred_departments', jp.preferred_departments,
          'employment_types', jp.employment_types,
          'minimum_salary', jp.minimum_salary,
          'maximum_salary', jp.maximum_salary,
          'salary_currency', jp.salary_currency,
          'salary_period', jp.salary_period,
          'availability_status', jp.availability_status,
          'available_from', jp.available_from,
          'notice_period_days', jp.notice_period_days
        )
        from public.candidate_job_preferences jp
        where jp.candidate_id = cc.id
      ),
      '{}'::jsonb
    ),

    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'language', cl.language,
            'proficiency', cl.proficiency
          )
          order by cl.language
        )
        from public.candidate_languages cl
        where cl.candidate_id = cc.id
      ),
      '[]'::jsonb
    ),

    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ch.id,
            'employer_name', ch.employer_name,
            'job_title', ch.job_title,
            'department', ch.department,
            'employment_type', ch.employment_type,
            'city', ch.city,
            'start_date', ch.start_date,
            'end_date', ch.end_date,
            'is_current', ch.is_current,
            'responsibilities', ch.responsibilities,
            'created_at', ch.created_at,
            'updated_at', ch.updated_at
          )
          order by ch.start_date desc
        )
        from public.candidate_employment_history ch
        where ch.candidate_id = cc.id
      ),
      '[]'::jsonb
    ),

    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', cd.id,
            'document_type', cd.document_type,
            'original_file_name', cd.original_file_name,
            'mime_type', cd.mime_type,
            'file_size_bytes', cd.file_size_bytes,
            'verification_status', cd.verification_status,
            'created_at', cd.created_at
          )
          order by cd.created_at desc
        )
        from public.candidate_documents cd
        where cd.candidate_id = cc.id
      ),
      '[]'::jsonb
    ),

    cc.created_at,
    cc.updated_at,
    cc.result_count
  from counted_candidates cc
  order by cc.experience_years desc, cc.full_name asc
  limit p_limit
  offset p_offset;
end;
$$;

revoke all on function public.admin_search_candidates(
  text, text, text, numeric, numeric, text, text, integer, integer
) from public, anon, authenticated;

grant execute on function public.admin_search_candidates(
  text, text, text, numeric, numeric, text, text, integer, integer
) to authenticated;

comment on function public.admin_search_candidates(
  text, text, text, numeric, numeric, text, text, integer, integer
) is
'Admin-only full candidate search. Restaurant disclosure is governed separately by candidate consent and admin release. Document storage paths are excluded from search results and require separate authorized access.';

-- ============================================================
-- END
-- ============================================================
