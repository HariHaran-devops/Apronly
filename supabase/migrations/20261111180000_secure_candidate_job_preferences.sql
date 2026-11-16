-- ============================================================
-- APRONLY: SECURE CANDIDATE JOB PREFERENCES
-- Authenticated candidate-owned preference workflow
-- ============================================================

create or replace function public.save_candidate_job_preferences(
    p_preferred_roles text[] default '{}',
    p_preferred_departments text[] default '{}',
    p_employment_types text[] default '{}',
    p_minimum_salary numeric default null,
    p_maximum_salary numeric default null,
    p_salary_currency text default 'INR',
    p_salary_period text default null,
    p_availability_status text default 'flexible',
    p_available_from date default null,
    p_notice_period_days integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid;
    normalized_roles text[];
    normalized_departments text[];
    normalized_employment_types text[];
    normalized_currency text;
    normalized_period text;
    normalized_availability text;
begin
    -- Identity comes exclusively from the authenticated session.
    current_user_id := (select auth.uid());

    if current_user_id is null then
        raise exception 'Authentication required';
    end if;

    -- A candidate profile must already exist.
    if not exists (
        select 1
        from public.candidate_profiles cp
        where cp.id = current_user_id
    ) then
        raise exception 'Complete your candidate profile first';
    end if;

    -- Validate selection counts.
    if coalesce(cardinality(p_preferred_roles), 0) > 20 then
        raise exception 'You can select up to 20 preferred roles';
    end if;

    if coalesce(cardinality(p_preferred_departments), 0) > 20 then
        raise exception 'You can select up to 20 departments';
    end if;

    if coalesce(cardinality(p_employment_types), 0) > 10 then
        raise exception 'You can select up to 10 employment types';
    end if;

    -- Validate individual selection values.
    if exists (
        select 1
        from unnest(coalesce(p_preferred_roles, array[]::text[]))
            as x(item_value)
        where item_value is null
           or char_length(btrim(item_value)) < 2
           or char_length(btrim(item_value)) > 100
    ) then
        raise exception 'Each preferred role must contain 2 to 100 characters';
    end if;

    if exists (
        select 1
        from unnest(coalesce(p_preferred_departments, array[]::text[]))
            as x(item_value)
        where item_value is null
           or char_length(btrim(item_value)) < 2
           or char_length(btrim(item_value)) > 100
    ) then
        raise exception 'Each department must contain 2 to 100 characters';
    end if;

    if exists (
        select 1
        from unnest(coalesce(p_employment_types, array[]::text[]))
            as x(item_value)
        where item_value is null
           or char_length(btrim(item_value)) < 2
           or char_length(btrim(item_value)) > 50
    ) then
        raise exception 'Each employment type must contain 2 to 50 characters';
    end if;

    -- Normalize arrays and preserve submitted order.
    select coalesce(
        array_agg(
            regexp_replace(btrim(x.item_value), '\s+', ' ', 'g')
            order by x.ord
        ),
        array[]::text[]
    )
    into normalized_roles
    from unnest(coalesce(p_preferred_roles, array[]::text[]))
        with ordinality as x(item_value, ord);

    select coalesce(
        array_agg(
            regexp_replace(btrim(x.item_value), '\s+', ' ', 'g')
            order by x.ord
        ),
        array[]::text[]
    )
    into normalized_departments
    from unnest(coalesce(p_preferred_departments, array[]::text[]))
        with ordinality as x(item_value, ord);

    select coalesce(
        array_agg(
            regexp_replace(btrim(x.item_value), '\s+', ' ', 'g')
            order by x.ord
        ),
        array[]::text[]
    )
    into normalized_employment_types
    from unnest(coalesce(p_employment_types, array[]::text[]))
        with ordinality as x(item_value, ord);

    -- Validate salary values.
    if p_minimum_salary is not null and p_minimum_salary < 0 then
        raise exception 'Minimum salary cannot be negative';
    end if;

    if p_maximum_salary is not null and p_maximum_salary < 0 then
        raise exception 'Maximum salary cannot be negative';
    end if;

    if p_minimum_salary is not null
       and p_maximum_salary is not null
       and p_minimum_salary > p_maximum_salary then
        raise exception 'Minimum salary cannot exceed maximum salary';
    end if;

    normalized_currency := upper(btrim(coalesce(p_salary_currency, 'INR')));

    if normalized_currency !~ '^[A-Z]{3}$' then
        raise exception 'Currency must be a valid three-letter code';
    end if;

    normalized_period := nullif(lower(btrim(p_salary_period)), '');

    if normalized_period is not null
       and normalized_period not in (
           'hourly',
           'daily',
           'weekly',
           'monthly',
           'yearly'
       ) then
        raise exception 'Invalid salary period';
    end if;

    if (p_minimum_salary is not null or p_maximum_salary is not null)
       and normalized_period is null then
        raise exception 'Salary period is required when salary is specified';
    end if;

    -- Validate availability.
    normalized_availability := lower(
        btrim(coalesce(p_availability_status, 'flexible'))
    );

    if normalized_availability not in (
        'immediate',
        'notice_period',
        'specific_date',
        'flexible'
    ) then
        raise exception 'Invalid availability status';
    end if;

    if p_notice_period_days is not null
       and p_notice_period_days not between 0 and 365 then
        raise exception 'Notice period must be between 0 and 365 days';
    end if;

    if normalized_availability = 'notice_period'
       and p_notice_period_days is null then
        raise exception 'Notice period days are required';
    end if;

    if normalized_availability = 'specific_date'
       and p_available_from is null then
        raise exception 'Available from date is required';
    end if;

    -- Save one preference record per candidate.
    insert into public.candidate_job_preferences (
        candidate_id,
        preferred_roles,
        preferred_departments,
        employment_types,
        minimum_salary,
        maximum_salary,
        salary_currency,
        salary_period,
        availability_status,
        available_from,
        notice_period_days
    )
    values (
        current_user_id,
        normalized_roles,
        normalized_departments,
        normalized_employment_types,
        p_minimum_salary,
        p_maximum_salary,
        normalized_currency,
        normalized_period,
        normalized_availability,
        p_available_from,
        p_notice_period_days
    )
    on conflict (candidate_id)
    do update set
        preferred_roles = excluded.preferred_roles,
        preferred_departments = excluded.preferred_departments,
        employment_types = excluded.employment_types,
        minimum_salary = excluded.minimum_salary,
        maximum_salary = excluded.maximum_salary,
        salary_currency = excluded.salary_currency,
        salary_period = excluded.salary_period,
        availability_status = excluded.availability_status,
        available_from = excluded.available_from,
        notice_period_days = excluded.notice_period_days;

    -- Record the operation without logging salary amounts.
    insert into public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        metadata
    )
    values (
        current_user_id,
        'candidate_job_preferences_updated',
        'candidate_job_preferences',
        current_user_id::text,
        jsonb_build_object(
            'preferred_roles_count', cardinality(normalized_roles),
            'preferred_departments_count', cardinality(normalized_departments),
            'employment_types_count', cardinality(normalized_employment_types),
            'availability_status', normalized_availability
        )
    );

    return current_user_id;
end;
$$;

-- Authenticated users only.
revoke all on function public.save_candidate_job_preferences(
    text[], text[], text[], numeric, numeric,
    text, text, text, date, integer
) from public, anon, authenticated;

grant execute on function public.save_candidate_job_preferences(
    text[], text[], text[], numeric, numeric,
    text, text, text, date, integer
) to authenticated;

comment on function public.save_candidate_job_preferences(
    text[], text[], text[], numeric, numeric,
    text, text, text, date, integer
) is
'Saves validated job preferences for the authenticated candidate and records an audit event.';

-- ============================================================
-- END OF MIGRATION
-- ============================================================