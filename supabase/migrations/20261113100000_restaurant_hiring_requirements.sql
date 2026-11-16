
begin;

-- ============================================================
-- APRONLY
-- Migration: Restaurant Hiring Requirements
-- ============================================================

create type public.hiring_request_status as enum (
  'draft',
  'pending_review',
  'changes_requested',
  'approved',
  'rejected',
  'closed'
);

create table public.restaurant_hiring_requests (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,

  created_by uuid not null
    references public.profiles(id),

  title text not null,
  department text not null,
  openings integer not null default 1,

  description text not null,
  responsibilities text,

  minimum_experience_years numeric(4,1) not null default 0,
  maximum_experience_years numeric(4,1),

  required_skills text[] not null default '{}',

  employment_type text not null,
  shift_type text not null,

  minimum_salary numeric(12,2),
  maximum_salary numeric(12,2),
  salary_currency varchar(3) not null default 'INR',
  salary_period text not null default 'monthly',

  city text not null,
  joining_timeline text not null,

  status public.hiring_request_status not null default 'draft',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint hiring_title_length
    check (char_length(title) between 2 and 150),

  constraint hiring_department_length
    check (char_length(department) between 2 and 100),

  constraint hiring_openings_range
    check (openings between 1 and 500),

  constraint hiring_description_length
    check (char_length(description) between 20 and 5000),

  constraint hiring_responsibilities_length
    check (
      responsibilities is null
      or char_length(responsibilities) <= 5000
    ),

  constraint hiring_experience_range
    check (
      minimum_experience_years >= 0
      and (
        maximum_experience_years is null
        or maximum_experience_years >= minimum_experience_years
      )
    ),

  constraint hiring_skills_count
    check (cardinality(required_skills) <= 30),

  constraint hiring_employment_type
    check (
      employment_type in (
        'full_time',
        'part_time',
        'contract',
        'temporary',
        'internship'
      )
    ),

  constraint hiring_shift_type
    check (
      shift_type in (
        'day',
        'night',
        'rotational',
        'flexible'
      )
    ),

  constraint hiring_salary_range
    check (
      (
        minimum_salary is null
        and maximum_salary is null
      )
      or (
        minimum_salary is not null
        and maximum_salary is not null
        and minimum_salary >= 0
        and maximum_salary >= minimum_salary
      )
    ),

  constraint hiring_salary_currency
    check (salary_currency ~ '^[A-Z]{3}$'),

  constraint hiring_salary_period
    check (
      salary_period in (
        'hourly',
        'daily',
        'weekly',
        'monthly',
        'yearly'
      )
    ),

  constraint hiring_city_length
    check (char_length(city) between 2 and 100),

  constraint hiring_joining_timeline
    check (
      joining_timeline in (
        'immediate',
        'within_15_days',
        'within_30_days',
        'within_60_days',
        'flexible'
      )
    )
);

-- ============================================================
-- INDEXES
-- ============================================================

create index hiring_requests_restaurant_idx
  on public.restaurant_hiring_requests(restaurant_id);

create index hiring_requests_status_idx
  on public.restaurant_hiring_requests(status);

create index hiring_requests_created_at_idx
  on public.restaurant_hiring_requests(created_at desc);

create index hiring_requests_city_idx
  on public.restaurant_hiring_requests(city);

create trigger restaurant_hiring_requests_updated_at
before update on public.restaurant_hiring_requests
for each row
execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.restaurant_hiring_requests
  enable row level security;

-- Restaurant members can read requests belonging to
-- restaurants where they have an active membership.
create policy "Restaurant members can view their hiring requests"
on public.restaurant_hiring_requests
for select
to authenticated
using (
  public.is_restaurant_member(restaurant_id)
  or (select public.is_admin())
);

-- No direct INSERT, UPDATE or DELETE policy is provided.
-- All mutations must go through the controlled RPC below.

revoke all on public.restaurant_hiring_requests
  from anon, authenticated;

grant select on public.restaurant_hiring_requests
  to authenticated;

-- ============================================================
-- SECURE HIRING REQUEST SAVE / SUBMISSION RPC
-- ============================================================

create or replace function public.save_restaurant_hiring_request(
  p_request_id uuid,
  p_restaurant_id uuid,
  p_title text,
  p_department text,
  p_openings integer,
  p_description text,
  p_responsibilities text,
  p_minimum_experience_years numeric,
  p_maximum_experience_years numeric,
  p_required_skills text[],
  p_employment_type text,
  p_shift_type text,
  p_minimum_salary numeric,
  p_maximum_salary numeric,
  p_salary_currency text,
  p_salary_period text,
  p_city text,
  p_joining_timeline text,
  p_submit boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  clean_title text;
  clean_department text;
  clean_description text;
  clean_responsibilities text;
  clean_city text;
  clean_currency text;
  clean_skills text[];
  clean_request_id uuid;
  existing_status public.hiring_request_status;
  next_status public.hiring_request_status;
begin
  current_user_id := (select auth.uid());

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Restaurant must be active and verified.
  if not exists (
    select 1
    from public.restaurants r
    where r.id = p_restaurant_id
      and r.status = 'active'::public.restaurant_status
      and r.verification_status = 'verified'::public.verification_status
  ) then
    raise exception 'Only approved and verified restaurants can create hiring requests';
  end if;

  -- Only active owners, managers and recruiters may create
  -- hiring requests for their restaurant.
  if not exists (
    select 1
    from public.restaurant_memberships rm
    where rm.restaurant_id = p_restaurant_id
      and rm.user_id = current_user_id
      and rm.status = 'active'::public.membership_status
      and rm.role in (
        'owner'::public.restaurant_member_role,
        'manager'::public.restaurant_member_role,
        'recruiter'::public.restaurant_member_role
      )
  ) then
    raise exception 'You are not authorized to manage hiring requests for this restaurant';
  end if;

  -- Normalize text.
  clean_title := btrim(coalesce(p_title, ''));
  clean_department := btrim(coalesce(p_department, ''));
  clean_description := btrim(coalesce(p_description, ''));
  clean_responsibilities := nullif(btrim(p_responsibilities), '');
  clean_city := btrim(coalesce(p_city, ''));
  clean_currency := upper(btrim(coalesce(p_salary_currency, 'INR')));

  select coalesce(
    array_agg(btrim(skill) order by skill_order),
    '{}'::text[]
  )
  into clean_skills
  from unnest(coalesce(p_required_skills, '{}'::text[]))
    with ordinality as skill_items(skill, skill_order)
  where btrim(skill) <> '';

  -- Validate title and department.
  if char_length(clean_title) not between 2 and 150 then
    raise exception 'Job title must be between 2 and 150 characters';
  end if;

  if char_length(clean_department) not between 2 and 100 then
    raise exception 'Department must be between 2 and 100 characters';
  end if;

  if p_openings is null or p_openings not between 1 and 500 then
    raise exception 'Number of openings must be between 1 and 500';
  end if;

  if char_length(clean_description) not between 20 and 5000 then
    raise exception 'Job description must be between 20 and 5000 characters';
  end if;

  if clean_responsibilities is not null
     and char_length(clean_responsibilities) > 5000 then
    raise exception 'Responsibilities cannot exceed 5000 characters';
  end if;

  if p_minimum_experience_years is null
     or p_minimum_experience_years < 0
     or (
       p_maximum_experience_years is not null
       and p_maximum_experience_years < p_minimum_experience_years
     ) then
    raise exception 'Invalid experience range';
  end if;

  if cardinality(clean_skills) > 30 then
    raise exception 'You can add a maximum of 30 required skills';
  end if;

  if p_employment_type not in (
    'full_time', 'part_time', 'contract', 'temporary', 'internship'
  ) then
    raise exception 'Invalid employment type';
  end if;

  if p_shift_type not in (
    'day', 'night', 'rotational', 'flexible'
  ) then
    raise exception 'Invalid shift type';
  end if;

  if (
    p_minimum_salary is null
    and p_maximum_salary is not null
  ) or (
    p_minimum_salary is not null
    and p_maximum_salary is null
  ) then
    raise exception 'Provide both salary limits or leave both empty';
  end if;

  if p_minimum_salary is not null
     and (
       p_minimum_salary < 0
       or p_maximum_salary < p_minimum_salary
     ) then
    raise exception 'Invalid salary range';
  end if;

  if clean_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid salary currency';
  end if;

  if p_salary_period not in (
    'hourly', 'daily', 'weekly', 'monthly', 'yearly'
  ) then
    raise exception 'Invalid salary period';
  end if;

  if char_length(clean_city) not between 2 and 100 then
    raise exception 'Enter a valid work city';
  end if;

  if p_joining_timeline not in (
    'immediate',
    'within_15_days',
    'within_30_days',
    'within_60_days',
    'flexible'
  ) then
    raise exception 'Invalid joining timeline';
  end if;

  next_status := case
    when coalesce(p_submit, false)
      then 'pending_review'::public.hiring_request_status
    else 'draft'::public.hiring_request_status
  end;

  -- Create or update a request.
  if p_request_id is null then

    insert into public.restaurant_hiring_requests (
      restaurant_id,
      created_by,
      title,
      department,
      openings,
      description,
      responsibilities,
      minimum_experience_years,
      maximum_experience_years,
      required_skills,
      employment_type,
      shift_type,
      minimum_salary,
      maximum_salary,
      salary_currency,
      salary_period,
      city,
      joining_timeline,
      status
    )
    values (
      p_restaurant_id,
      current_user_id,
      clean_title,
      clean_department,
      p_openings,
      clean_description,
      clean_responsibilities,
      p_minimum_experience_years,
      p_maximum_experience_years,
      clean_skills,
      p_employment_type,
      p_shift_type,
      p_minimum_salary,
      p_maximum_salary,
      clean_currency,
      p_salary_period,
      clean_city,
      p_joining_timeline,
      next_status
    )
    returning id into clean_request_id;

  else

    select h.status
    into existing_status
    from public.restaurant_hiring_requests h
    where h.id = p_request_id
      and h.restaurant_id = p_restaurant_id
    for update;

    if not found then
      raise exception 'Hiring request not found';
    end if;

    if existing_status not in (
      'draft'::public.hiring_request_status,
      'changes_requested'::public.hiring_request_status
    ) then
      raise exception 'This hiring request can no longer be edited';
    end if;

    update public.restaurant_hiring_requests
    set
      title = clean_title,
      department = clean_department,
      openings = p_openings,
      description = clean_description,
      responsibilities = clean_responsibilities,
      minimum_experience_years = p_minimum_experience_years,
      maximum_experience_years = p_maximum_experience_years,
      required_skills = clean_skills,
      employment_type = p_employment_type,
      shift_type = p_shift_type,
      minimum_salary = p_minimum_salary,
      maximum_salary = p_maximum_salary,
      salary_currency = clean_currency,
      salary_period = p_salary_period,
      city = clean_city,
      joining_timeline = p_joining_timeline,
      status = next_status
    where id = p_request_id
      and restaurant_id = p_restaurant_id
    returning id into clean_request_id;

  end if;

  -- Record the action without exposing private contact details.
  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    current_user_id,
    case
      when next_status = 'pending_review'
        then 'restaurant_hiring_request_submitted'
      else 'restaurant_hiring_request_saved'
    end,
    'restaurant_hiring_request',
    clean_request_id::text,
    jsonb_build_object(
      'restaurant_id', p_restaurant_id,
      'title', clean_title,
      'department', clean_department,
      'city', clean_city,
      'openings', p_openings,
      'status', next_status
    )
  );

  return clean_request_id;
end;
$$;

-- ============================================================
-- FUNCTION PERMISSIONS
-- ============================================================

revoke all on function public.save_restaurant_hiring_request(
  uuid, uuid, text, text, integer, text, text,
  numeric, numeric, text[], text, text,
  numeric, numeric, text, text, text, text, boolean
)
from public, anon, authenticated;

grant execute on function public.save_restaurant_hiring_request(
  uuid, uuid, text, text, integer, text, text,
  numeric, numeric, text[], text, text,
  numeric, numeric, text, text, text, text, boolean
)
to authenticated;

comment on table public.restaurant_hiring_requests is
'Private restaurant hiring requests. Public job listings must be exposed through a separately approved and privacy-safe interface.';

comment on function public.save_restaurant_hiring_request(
  uuid, uuid, text, text, integer, text, text,
  numeric, numeric, text[], text, text,
  numeric, numeric, text, text, text, text, boolean
) is
'Creates or updates a draft or submits a hiring request for an active verified restaurant through an authorized active member.';

commit;
