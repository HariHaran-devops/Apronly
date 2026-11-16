begin;

-- ============================================================
-- APRONLY R2: PRIVATE RECRUITMENT PIPELINE
-- No public jobs, browsing or public applications.
-- ============================================================

-- 1. PIPELINE ENUMS

create type public.candidate_match_status as enum (
  'matched',
  'invited',
  'accepted',
  'declined',
  'shortlisted',
  'consent_requested',
  'consented',
  'released',
  'withdrawn',
  'closed'
);

create type public.candidate_invitation_status as enum (
  'pending',
  'accepted',
  'declined',
  'expired',
  'withdrawn'
);

create type public.candidate_shortlist_status as enum (
  'active',
  'removed'
);

create type public.candidate_disclosure_status as enum (
  'pending',
  'approved',
  'declined'
);


-- 2. ADMIN-CREATED CANDIDATE MATCHES

create table public.candidate_vacancy_matches (
  id uuid primary key default gen_random_uuid(),

  hiring_request_id uuid not null
    references public.restaurant_hiring_requests(id) on delete restrict,

  candidate_id uuid not null
    references public.candidate_profiles(id) on delete restrict,

  created_by uuid not null
    references public.profiles(id) on delete restrict,

  status public.candidate_match_status not null default 'matched',

  internal_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint candidate_match_unique_vacancy
    unique (hiring_request_id, candidate_id),

  constraint candidate_match_notes_length
    check (internal_notes is null or char_length(internal_notes) <= 5000)
);

create index candidate_matches_candidate_idx
  on public.candidate_vacancy_matches(candidate_id);

create index candidate_matches_request_idx
  on public.candidate_vacancy_matches(hiring_request_id);

create index candidate_matches_status_idx
  on public.candidate_vacancy_matches(status);

create trigger candidate_vacancy_matches_updated_at
before update on public.candidate_vacancy_matches
for each row execute function public.set_updated_at();


-- 3. PRIVATE CANDIDATE INVITATIONS

create table public.candidate_opportunity_invitations (
  id uuid primary key default gen_random_uuid(),

  match_id uuid not null unique
    references public.candidate_vacancy_matches(id) on delete restrict,

  candidate_id uuid not null
    references public.candidate_profiles(id) on delete restrict,

  invitation_message text,

  status public.candidate_invitation_status not null default 'pending',

  sent_at timestamptz not null default now(),
  expires_at timestamptz not null,

  responded_at timestamptz,

  created_at timestamptz not null default now(),

  constraint candidate_invitation_message_length
    check (
      invitation_message is null
      or char_length(invitation_message) <= 2000
    ),

  constraint candidate_invitation_expiry
    check (expires_at > sent_at)
);

create index candidate_invitations_candidate_idx
  on public.candidate_opportunity_invitations(candidate_id, sent_at desc);

create index candidate_invitations_status_idx
  on public.candidate_opportunity_invitations(status, expires_at);


-- 4. ADMIN SHORTLIST

create table public.candidate_vacancy_shortlists (
  id uuid primary key default gen_random_uuid(),

  match_id uuid not null unique
    references public.candidate_vacancy_matches(id) on delete restrict,

  created_by uuid not null
    references public.profiles(id) on delete restrict,

  status public.candidate_shortlist_status not null default 'active',

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint candidate_shortlist_notes_length
    check (notes is null or char_length(notes) <= 5000)
);

create index candidate_shortlists_status_idx
  on public.candidate_vacancy_shortlists(status);

create trigger candidate_vacancy_shortlists_updated_at
before update on public.candidate_vacancy_shortlists
for each row execute function public.set_updated_at();


-- 5. CONTROLLED DISCLOSURE AND RELEASE

create table public.candidate_vacancy_releases (
  id uuid primary key default gen_random_uuid(),

  match_id uuid not null unique
    references public.candidate_vacancy_matches(id) on delete restrict,

  candidate_id uuid not null
    references public.candidate_profiles(id) on delete restrict,

  restaurant_id uuid not null
    references public.restaurants(id) on delete restrict,

  consent_status public.candidate_disclosure_status
    not null default 'pending',

  consent_requested_at timestamptz not null default now(),
  consent_responded_at timestamptz,

  released_by uuid
    references public.profiles(id) on delete set null,

  released_at timestamptz,

  created_at timestamptz not null default now(),

  constraint candidate_release_consent_timestamps
    check (
      (consent_status = 'pending' and consent_responded_at is null)
      or
      (consent_status in ('approved', 'declined')
       and consent_responded_at is not null)
    ),

  constraint candidate_release_timestamp_pair
    check (
      (released_at is null and released_by is null)
      or
      (released_at is not null and released_by is not null)
    ),

  constraint candidate_release_requires_consent
    check (
      released_at is null
      or consent_status = 'approved'
    )
);

create index candidate_releases_candidate_idx
  on public.candidate_vacancy_releases(candidate_id);

create index candidate_releases_restaurant_idx
  on public.candidate_vacancy_releases(restaurant_id);

create index candidate_releases_released_idx
  on public.candidate_vacancy_releases(restaurant_id, released_at)
  where released_at is not null;


-- 6. RECRUITMENT EVENT HISTORY

create table public.candidate_recruitment_events (
  id uuid primary key default gen_random_uuid(),

  match_id uuid not null
    references public.candidate_vacancy_matches(id) on delete restrict,

  actor_id uuid
    references public.profiles(id) on delete set null,

  event_type text not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint recruitment_event_type_length
    check (char_length(event_type) between 2 and 100),

  constraint recruitment_event_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create index candidate_recruitment_events_match_idx
  on public.candidate_recruitment_events(match_id, created_at desc);


-- 7. ROW LEVEL SECURITY

alter table public.candidate_vacancy_matches
  enable row level security;

alter table public.candidate_opportunity_invitations
  enable row level security;

alter table public.candidate_vacancy_shortlists
  enable row level security;

alter table public.candidate_vacancy_releases
  enable row level security;

alter table public.candidate_recruitment_events
  enable row level security;


-- Admins can read the internal recruitment pipeline.

create policy "Admins view candidate vacancy matches"
on public.candidate_vacancy_matches
for select to authenticated
using ((select public.is_admin()));

create policy "Admins view candidate invitations"
on public.candidate_opportunity_invitations
for select to authenticated
using ((select public.is_admin()));

create policy "Candidates view their own invitations"
on public.candidate_opportunity_invitations
for select to authenticated
using (candidate_id = (select auth.uid()));

create policy "Admins view candidate shortlists"
on public.candidate_vacancy_shortlists
for select to authenticated
using ((select public.is_admin()));

create policy "Admins view candidate releases"
on public.candidate_vacancy_releases
for select to authenticated
using ((select public.is_admin()));

-- Candidates can see a disclosure record only after an admin
-- has explicitly requested identity disclosure.
create policy "Candidates view requested disclosure"
on public.candidate_vacancy_releases
for select to authenticated
using (
  candidate_id = (select auth.uid())
  and consent_requested_at is not null
);

-- Restaurants can see only release records for their own
-- restaurant after candidate consent and admin release.
create policy "Restaurants view authorized candidate releases"
on public.candidate_vacancy_releases
for select to authenticated
using (
  released_at is not null
  and public.is_restaurant_member(restaurant_id)
);

create policy "Admins view recruitment event history"
on public.candidate_recruitment_events
for select to authenticated
using ((select public.is_admin()));


-- 8. MINIMUM TABLE PRIVILEGES

revoke all on public.candidate_vacancy_matches
  from anon, authenticated;

revoke all on public.candidate_opportunity_invitations
  from anon, authenticated;

revoke all on public.candidate_vacancy_shortlists
  from anon, authenticated;

revoke all on public.candidate_vacancy_releases
  from anon, authenticated;

revoke all on public.candidate_recruitment_events
  from anon, authenticated;

grant select on public.candidate_vacancy_matches to authenticated;
grant select on public.candidate_opportunity_invitations to authenticated;
grant select on public.candidate_vacancy_shortlists to authenticated;
grant select on public.candidate_vacancy_releases to authenticated;
grant select on public.candidate_recruitment_events to authenticated;


-- 9. ADMIN INVITES A CANDIDATE TO AN APPROVED VACANCY

create or replace function public.admin_invite_candidate(
  p_hiring_request_id uuid,
  p_candidate_id uuid,
  p_invitation_message text default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_match_id uuid;
  v_invitation_id uuid;
  v_message text;
  v_expiry timestamptz;
begin
  v_admin_id := (select auth.uid());

  if v_admin_id is null or not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  if not exists (
    select 1
    from public.restaurant_hiring_requests h
    where h.id = p_hiring_request_id
      and h.status = 'approved'::public.hiring_request_status
  ) then
    raise exception 'Only approved hiring requests can receive candidates';
  end if;

  if not exists (
    select 1
    from public.candidate_profiles cp
    join public.user_roles ur on ur.user_id = cp.id
    where cp.id = p_candidate_id
      and ur.role = 'candidate'
  ) then
    raise exception 'Candidate profile not found';
  end if;

  v_message := nullif(btrim(coalesce(p_invitation_message, '')), '');
  v_expiry := coalesce(p_expires_at, now() + interval '7 days');

  if v_message is not null and char_length(v_message) > 2000 then
    raise exception 'Invitation message cannot exceed 2000 characters';
  end if;

  if v_expiry <= now() or v_expiry > now() + interval '30 days' then
    raise exception 'Invitation expiry must be within the next 30 days';
  end if;

  insert into public.candidate_vacancy_matches (
    hiring_request_id,
    candidate_id,
    created_by,
    status
  )
  values (
    p_hiring_request_id,
    p_candidate_id,
    v_admin_id,
    'invited'
  )
  returning id into v_match_id;

  insert into public.candidate_opportunity_invitations (
    match_id,
    candidate_id,
    invitation_message,
    expires_at
  )
  values (
    v_match_id,
    p_candidate_id,
    v_message,
    v_expiry
  )
  returning id into v_invitation_id;

  insert into public.candidate_recruitment_events (
    match_id,
    actor_id,
    event_type,
    metadata
  )
  values (
    v_match_id,
    v_admin_id,
    'candidate_invited',
    jsonb_build_object(
      'invitation_id', v_invitation_id,
      'expires_at', v_expiry
    )
  );

  return v_invitation_id;
end;
$$;


-- 10. CANDIDATE RESPONDS TO A PRIVATE INVITATION

create or replace function public.respond_to_candidate_invitation(
  p_invitation_id uuid,
  p_response text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate_id uuid;
  v_match_id uuid;
  v_status public.candidate_invitation_status;
  v_next_status public.candidate_match_status;
begin
  v_candidate_id := (select auth.uid());

  if v_candidate_id is null then
    raise exception 'Authentication required';
  end if;

  if p_response not in ('accepted', 'declined') then
    raise exception 'Response must be accepted or declined';
  end if;

  select i.match_id, i.status
  into v_match_id, v_status
  from public.candidate_opportunity_invitations i
  where i.id = p_invitation_id
    and i.candidate_id = v_candidate_id
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if v_status <> 'pending' then
    raise exception 'This invitation has already been answered or closed';
  end if;

  update public.candidate_opportunity_invitations
  set
    status = p_response::public.candidate_invitation_status,
    responded_at = now()
  where id = p_invitation_id;

  if p_response = 'accepted' then
    v_next_status := 'accepted'::public.candidate_match_status;
  else
    v_next_status := 'declined'::public.candidate_match_status;
  end if;

  update public.candidate_vacancy_matches
  set status = v_next_status
  where id = v_match_id;

  insert into public.candidate_recruitment_events (
    match_id,
    actor_id,
    event_type,
    metadata
  )
  values (
    v_match_id,
    v_candidate_id,
    'candidate_invitation_' || p_response,
    '{}'::jsonb
  );

  return v_match_id;
end;
$$;


-- 11. CANDIDATE READS MASKED OPPORTUNITIES
-- Restaurant name, outlet, restaurant ID and recruiter details
-- are deliberately excluded from this response.

create or replace function public.get_my_candidate_opportunities()
returns table (
  invitation_id uuid,
  match_id uuid,
  title text,
  department text,
  description text,
  responsibilities text,
  city text,
  employment_type text,
  shift_type text,
  minimum_salary numeric,
  maximum_salary numeric,
  salary_currency varchar,
  salary_period text,
  minimum_experience_years numeric,
  maximum_experience_years numeric,
  required_skills text[],
  joining_timeline text,
  invitation_message text,
  invitation_status public.candidate_invitation_status,
  sent_at timestamptz,
  expires_at timestamptz,
  responded_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    i.id,
    m.id,
    h.title,
    h.department,
    h.description,
    h.responsibilities,
    h.city,
    h.employment_type,
    h.shift_type,
    h.minimum_salary,
    h.maximum_salary,
    h.salary_currency,
    h.salary_period,
    h.minimum_experience_years,
    h.maximum_experience_years,
    h.required_skills,
    h.joining_timeline,
    i.invitation_message,
    i.status,
    i.sent_at,
    i.expires_at,
    i.responded_at
  from public.candidate_opportunity_invitations i
  join public.candidate_vacancy_matches m on m.id = i.match_id
  join public.restaurant_hiring_requests h on h.id = m.hiring_request_id
  where i.candidate_id = (select auth.uid())
  order by i.sent_at desc;
$$;


-- 12. ADMIN SHORTLISTS AN ACCEPTING CANDIDATE

create or replace function public.admin_shortlist_candidate(
  p_match_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_candidate_id uuid;
  v_shortlist_id uuid;
  v_notes text;
begin
  v_admin_id := (select auth.uid());

  if v_admin_id is null or not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  v_notes := nullif(btrim(coalesce(p_notes, '')), '');

  if v_notes is not null and char_length(v_notes) > 5000 then
    raise exception 'Shortlist notes cannot exceed 5000 characters';
  end if;

  select m.candidate_id
  into v_candidate_id
  from public.candidate_vacancy_matches m
  join public.candidate_opportunity_invitations i
    on i.match_id = m.id
  where m.id = p_match_id
    and i.status = 'accepted'::public.candidate_invitation_status
  for update of m;

  if not found then
    raise exception 'Only candidates who accepted an invitation can be shortlisted';
  end if;

  insert into public.candidate_vacancy_shortlists (
    match_id,
    created_by,
    notes,
    status
  )
  values (
    p_match_id,
    v_admin_id,
    v_notes,
    'active'
  )
  on conflict (match_id)
  do update set
    created_by = excluded.created_by,
    notes = excluded.notes,
    status = 'active'
  returning id into v_shortlist_id;

  update public.candidate_vacancy_matches
  set status = 'shortlisted'
  where id = p_match_id;

  insert into public.candidate_recruitment_events (
    match_id,
    actor_id,
    event_type,
    metadata
  )
  values (
    p_match_id,
    v_admin_id,
    'candidate_shortlisted',
    '{}'::jsonb
  );

  return v_shortlist_id;
end;
$$;


-- 13. ADMIN REQUESTS CANDIDATE CONSENT TO DISCLOSE IDENTITY
-- This creates a consent-pending record. It does not release
-- candidate information to the restaurant.

create or replace function public.admin_request_candidate_disclosure(
  p_match_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_candidate_id uuid;
  v_restaurant_id uuid;
  v_release_id uuid;
begin
  v_admin_id := (select auth.uid());

  if v_admin_id is null or not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  select m.candidate_id, h.restaurant_id
  into v_candidate_id, v_restaurant_id
  from public.candidate_vacancy_matches m
  join public.restaurant_hiring_requests h
    on h.id = m.hiring_request_id
  join public.candidate_vacancy_shortlists s
    on s.match_id = m.id
  where m.id = p_match_id
    and s.status = 'active'
    and m.status = 'shortlisted'
    and h.status = 'approved'
  for update of m;

  if not found then
    raise exception 'An active shortlist for an approved vacancy is required';
  end if;

  insert into public.candidate_vacancy_releases (
    match_id,
    candidate_id,
    restaurant_id,
    consent_status
  )
  values (
    p_match_id,
    v_candidate_id,
    v_restaurant_id,
    'pending'
  )
  returning id into v_release_id;

  update public.candidate_vacancy_matches
  set status = 'consent_requested'
  where id = p_match_id;

  insert into public.candidate_recruitment_events (
    match_id,
    actor_id,
    event_type,
    metadata
  )
  values (
    p_match_id,
    v_admin_id,
    'candidate_disclosure_consent_requested',
    jsonb_build_object('release_id', v_release_id)
  );

  return v_release_id;
end;
$$;


-- 14. CANDIDATE VIEWS THE IDENTITY DISCLOSURE REQUEST
-- Restaurant identity is disclosed only after the admin
-- explicitly requests consent.

create or replace function public.get_my_pending_disclosures()
returns table (
  release_id uuid,
  match_id uuid,
  restaurant_name text,
  restaurant_city text,
  role_title text,
  department text,
  work_city text,
  consent_requested_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    r.id,
    r.match_id,
    rest.name,
    rest.city,
    h.title,
    h.department,
    h.city,
    r.consent_requested_at
  from public.candidate_vacancy_releases r
  join public.restaurants rest on rest.id = r.restaurant_id
  join public.candidate_vacancy_matches m on m.id = r.match_id
  join public.restaurant_hiring_requests h on h.id = m.hiring_request_id
  where r.candidate_id = (select auth.uid())
    and r.consent_status = 'pending'
    and r.released_at is null;
$$;


-- 15. CANDIDATE APPROVES OR DECLINES IDENTITY DISCLOSURE

create or replace function public.respond_to_candidate_disclosure(
  p_release_id uuid,
  p_decision text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate_id uuid;
  v_match_id uuid;
  v_status public.candidate_disclosure_status;
  v_next_status public.candidate_match_status;
begin
  v_candidate_id := (select auth.uid());

  if v_candidate_id is null then
    raise exception 'Authentication required';
  end if;

  if p_decision not in ('approved', 'declined') then
    raise exception 'Decision must be approved or declined';
  end if;

  select r.match_id, r.consent_status
  into v_match_id, v_status
  from public.candidate_vacancy_releases r
  where r.id = p_release_id
    and r.candidate_id = v_candidate_id
  for update;

  if not found or v_status <> 'pending' then
    raise exception 'Disclosure request not found or already answered';
  end if;

  update public.candidate_vacancy_releases
  set
    consent_status = p_decision::public.candidate_disclosure_status,
    consent_responded_at = now()
  where id = p_release_id;

  if p_decision = 'approved' then
    v_next_status := 'consented'::public.candidate_match_status;
  else
    v_next_status := 'withdrawn'::public.candidate_match_status;
  end if;

  update public.candidate_vacancy_matches
  set status = v_next_status
  where id = v_match_id;

  insert into public.candidate_recruitment_events (
    match_id,
    actor_id,
    event_type,
    metadata
  )
  values (
    v_match_id,
    v_candidate_id,
    'candidate_disclosure_' || p_decision,
    '{}'::jsonb
  );

  return v_match_id;
end;
$$;


-- 16. ADMIN AUTHORIZES FINAL RELEASE TO THE RESTAURANT
-- Consent alone is not enough: admin must explicitly release.

create or replace function public.admin_release_candidate(
  p_match_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_release_id uuid;
begin
  v_admin_id := (select auth.uid());

  if v_admin_id is null or not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  select r.id
  into v_release_id
  from public.candidate_vacancy_releases r
  join public.candidate_vacancy_matches m on m.id = r.match_id
  join public.restaurant_hiring_requests h on h.id = m.hiring_request_id
  where r.match_id = p_match_id
    and r.consent_status = 'approved'
    and r.released_at is null
    and m.status = 'consented'
    and h.status = 'approved'
  for update of r;

  if not found then
    raise exception 'Candidate consent and an approved vacancy are required before release';
  end if;

  update public.candidate_vacancy_releases
  set
    released_by = v_admin_id,
    released_at = now()
  where id = v_release_id;

  update public.candidate_vacancy_matches
  set status = 'released'
  where id = p_match_id;

  insert into public.candidate_recruitment_events (
    match_id,
    actor_id,
    event_type,
    metadata
  )
  values (
    p_match_id,
    v_admin_id,
    'candidate_released_to_restaurant',
    jsonb_build_object('release_id', v_release_id)
  );

  return v_release_id;
end;
$$;


-- 17. FUNCTION PERMISSIONS

revoke all on function public.admin_invite_candidate(uuid, uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_invite_candidate(uuid, uuid, text, timestamptz)
  to authenticated;

revoke all on function public.respond_to_candidate_invitation(uuid, text)
  from public, anon, authenticated;
grant execute on function public.respond_to_candidate_invitation(uuid, text)
  to authenticated;

revoke all on function public.get_my_candidate_opportunities()
  from public, anon, authenticated;
grant execute on function public.get_my_candidate_opportunities()
  to authenticated;

revoke all on function public.admin_shortlist_candidate(uuid, text)
  from public, anon, authenticated;
grant execute on function public.admin_shortlist_candidate(uuid, text)
  to authenticated;

revoke all on function public.admin_request_candidate_disclosure(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_request_candidate_disclosure(uuid)
  to authenticated;

revoke all on function public.get_my_pending_disclosures()
  from public, anon, authenticated;
grant execute on function public.get_my_pending_disclosures()
  to authenticated;

revoke all on function public.respond_to_candidate_disclosure(uuid, text)
  from public, anon, authenticated;
grant execute on function public.respond_to_candidate_disclosure(uuid, text)
  to authenticated;

revoke all on function public.admin_release_candidate(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_release_candidate(uuid)
  to authenticated;


-- 18. DOCUMENTATION

comment on table public.candidate_vacancy_matches is
'Private admin-created matches between candidates and approved restaurant hiring requests.';

comment on table public.candidate_opportunity_invitations is
'Private candidate invitations. Candidate-facing opportunity details are returned through a masked RPC.';

comment on table public.candidate_vacancy_shortlists is
'Admin-controlled shortlist. Candidate acceptance does not automatically create a restaurant introduction.';

comment on table public.candidate_vacancy_releases is
'Candidate identity disclosure consent and explicit admin-controlled restaurant release. Does not grant direct access to candidate profile data.';

comment on table public.candidate_recruitment_events is
'Audit history for private recruitment workflow events.';

comment on function public.get_my_candidate_opportunities() is
'Returns masked opportunity details to the authenticated candidate without restaurant identity or contact details.';

comment on function public.get_my_pending_disclosures() is
'Returns restaurant identity to a candidate only after an administrator has requested disclosure consent.';

commit;
