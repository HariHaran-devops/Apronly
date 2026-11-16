
-- ============================================================
-- APRONLY
-- Migration: Initial Identity and Access
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. ENUM TYPES
-- ------------------------------------------------------------

create type public.app_role as enum (
  'candidate',
  'restaurant_staff',
  'admin',
  'support'
);

create type public.account_status as enum (
  'active',
  'suspended',
  'deactivated'
);

create type public.verification_status as enum (
  'unverified',
  'pending',
  'verified',
  'rejected'
);

create type public.restaurant_status as enum (
  'pending',
  'active',
  'suspended',
  'rejected'
);

create type public.restaurant_member_role as enum (
  'owner',
  'manager',
  'recruiter'
);

create type public.membership_status as enum (
  'invited',
  'active',
  'suspended',
  'revoked'
);

-- ------------------------------------------------------------
-- 2. UPDATED_AT TRIGGER FUNCTION
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at()
  from public, anon, authenticated;

-- ------------------------------------------------------------
-- 3. SHARED USER PROFILES
-- ------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  full_name text,
  phone text,
  avatar_url text,

  account_status public.account_status
    not null default 'active',

  verification_status public.verification_status
    not null default 'unverified',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_full_name_length
    check (full_name is null or char_length(full_name) <= 150),

  constraint profiles_phone_length
    check (phone is null or char_length(phone) <= 30)
);

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4. USER ROLES
-- ------------------------------------------------------------

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.profiles(id) on delete cascade,

  role public.app_role not null,

  assigned_by uuid
    references public.profiles(id) on delete set null,

  created_at timestamptz not null default now(),

  constraint user_roles_unique
    unique (user_id, role)
);

create index user_roles_user_id_idx
  on public.user_roles(user_id);

-- ------------------------------------------------------------
-- 5. CANDIDATE PROFILES
-- ------------------------------------------------------------

create table public.candidate_profiles (
  id uuid primary key
    references public.profiles(id) on delete cascade,

  bio text,
  city text,
  preferred_cities text[] not null default '{}',

  skills text[] not null default '{}',

  experience_years numeric(4,1)
    not null default 0
    check (experience_years >= 0),

  current_position text,
  employment_status text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger candidate_profiles_updated_at
before update on public.candidate_profiles
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 6. RESTAURANTS
-- ------------------------------------------------------------

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  legal_name text,

  slug text not null unique,

  description text,
  city text not null,

  verification_status public.verification_status
    not null default 'unverified',

  status public.restaurant_status
    not null default 'pending',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint restaurants_name_length
    check (char_length(name) between 2 and 200),

  constraint restaurants_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index restaurants_city_idx
  on public.restaurants(city);

create trigger restaurants_updated_at
before update on public.restaurants
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 7. RESTAURANT MEMBERSHIPS
-- ------------------------------------------------------------

create table public.restaurant_memberships (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,

  user_id uuid not null
    references public.profiles(id) on delete cascade,

  role public.restaurant_member_role not null,

  status public.membership_status
    not null default 'invited',

  invited_by uuid
    references public.profiles(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint restaurant_memberships_unique
    unique (restaurant_id, user_id)
);

create index restaurant_memberships_user_idx
  on public.restaurant_memberships(user_id);

create index restaurant_memberships_restaurant_idx
  on public.restaurant_memberships(restaurant_id);

create trigger restaurant_memberships_updated_at
before update on public.restaurant_memberships
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 8. SECURITY HELPER FUNCTIONS
-- ------------------------------------------------------------

-- Checks only whether the CURRENT authenticated user is an admin.
-- Does not accept another user's ID, avoiding role-enumeration access.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'admin'::public.app_role
  );
$$;

create or replace function public.is_restaurant_member(
  requested_restaurant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.restaurant_memberships rm
    where rm.restaurant_id = requested_restaurant_id
      and rm.user_id = (select auth.uid())
      and rm.status = 'active'
  );
$$;

revoke all on function public.is_admin()
  from public, anon;

revoke all on function public.is_restaurant_member(uuid)
  from public, anon;

grant execute on function public.is_admin()
  to authenticated;

grant execute on function public.is_restaurant_member(uuid)
  to authenticated;

-- ------------------------------------------------------------
-- 9. AUTOMATIC PROFILE CREATION
-- ------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    full_name
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user()
  from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 10. ENABLE ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_memberships enable row level security;

-- ------------------------------------------------------------
-- 11. PROFILES POLICIES
-- ------------------------------------------------------------

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin())
);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- ------------------------------------------------------------
-- 12. USER ROLE POLICIES
-- ------------------------------------------------------------

create policy "Users can view their own roles"
on public.user_roles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin())
);

create policy "Admins can manage user roles"
on public.user_roles
for all
to authenticated
using (
  (select public.is_admin())
)
with check (
  (select public.is_admin())
);

-- ------------------------------------------------------------
-- 13. CANDIDATE PROFILE POLICIES
-- ------------------------------------------------------------

create policy "Candidates can view their own candidate profile"
on public.candidate_profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin())
);

create policy "Candidates can create their own candidate profile"
on public.candidate_profiles
for insert
to authenticated
with check (id = (select auth.uid()));

create policy "Candidates can update their own candidate profile"
on public.candidate_profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- ------------------------------------------------------------
-- 14. RESTAURANT POLICIES
-- ------------------------------------------------------------

create policy "Restaurant members can view their restaurants"
on public.restaurants
for select
to authenticated
using (
  (select public.is_restaurant_member(id))
  or (select public.is_admin())
);

create policy "Admins can manage restaurants"
on public.restaurants
for all
to authenticated
using (
  (select public.is_admin())
)
with check (
  (select public.is_admin())
);

-- ------------------------------------------------------------
-- 15. RESTAURANT MEMBERSHIP POLICIES
-- ------------------------------------------------------------

create policy "Users can view their own memberships"
on public.restaurant_memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin())
);

create policy "Admins can manage restaurant memberships"
on public.restaurant_memberships
for all
to authenticated
using (
  (select public.is_admin())
)
with check (
  (select public.is_admin())
);

-- ------------------------------------------------------------
-- 16. AUDIT LOGS
-- ------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  actor_id uuid
    references public.profiles(id) on delete set null,

  action text not null,
  entity_type text not null,
  entity_id text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index audit_logs_actor_idx
  on public.audit_logs(actor_id);

create index audit_logs_entity_idx
  on public.audit_logs(entity_type, entity_id);

create index audit_logs_created_at_idx
  on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

create policy "Admins can view audit logs"
on public.audit_logs
for select
to authenticated
using (
  (select public.is_admin())
);

-- ------------------------------------------------------------
-- 17. TABLE PRIVILEGES
-- ------------------------------------------------------------

-- Remove all existing privileges before granting the minimum required.
revoke all privileges on public.profiles from anon, authenticated;
revoke all privileges on public.user_roles from anon, authenticated;
revoke all privileges on public.candidate_profiles from anon, authenticated;
revoke all privileges on public.restaurants from anon, authenticated;
revoke all privileges on public.restaurant_memberships from anon, authenticated;
revoke all privileges on public.audit_logs from anon, authenticated;

-- PROFILES
-- Users can read permitted profiles but can only update ordinary
-- profile fields. Account and verification status remain protected.
grant select
on public.profiles to authenticated;

grant update (full_name, phone, avatar_url)
on public.profiles to authenticated;

-- USER ROLES
-- RLS restricts role management to authorized admins.
grant select, insert, update, delete
on public.user_roles to authenticated;

-- CANDIDATE PROFILES
-- RLS restricts access to the candidate and authorized admins.
grant select, insert, update
on public.candidate_profiles to authenticated;

-- RESTAURANTS
-- RLS restricts access and management to authorized members/admins.
grant select, insert, update, delete
on public.restaurants to authenticated;

-- RESTAURANT MEMBERSHIPS
-- RLS restricts membership management to authorized admins.
grant select, insert, update, delete
on public.restaurant_memberships to authenticated;

-- AUDIT LOGS
-- Authenticated users receive read access only where RLS permits.
-- No client-side insert, update, or delete privileges.
grant select
on public.audit_logs to authenticated;

-- ------------------------------------------------------------
-- 18. INITIAL ADMIN BOOTSTRAP
-- ------------------------------------------------------------

-- Intentionally not automated. After applying this migration, create
-- the first admin role through the Supabase SQL Editor as the trusted
-- project owner. Replace the UUID with the intended auth.users.id:
--
-- insert into public.user_roles (user_id, role)
-- select id, 'admin'::public.app_role
-- from auth.users
-- where id = 'REPLACE-WITH-USER-UUID'
-- on conflict (user_id, role) do nothing;
--
-- Never expose this operation through a public API or signup metadata.

-- ============================================================
-- END OF INITIAL IDENTITY AND ACCESS MIGRATION
-- ============================================================
