
begin;

-- ============================================================
-- APRONLY
-- Migration: Restaurant Business Profile and Outlets
-- ============================================================

-- 1. Extend the restaurant business profile.

alter table public.restaurants
  add column business_email text,
  add column business_phone text,
  add column website_url text,
  add column category text;

alter table public.restaurants
  add constraint restaurants_business_email_length
    check (
      business_email is null
      or char_length(business_email) <= 254
    ),
  add constraint restaurants_business_phone_length
    check (
      business_phone is null
      or char_length(business_phone) <= 30
    ),
  add constraint restaurants_website_url_length
    check (
      website_url is null
      or char_length(website_url) <= 2048
    ),
  add constraint restaurants_category_length
    check (
      category is null
      or char_length(category) between 2 and 80
    );

-- 2. Create restaurant outlets.
-- Each business can manage multiple physical locations.

create table public.restaurant_outlets (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,

  name text not null,

  city text not null,

  address_line1 text,
  address_line2 text,
  landmark text,

  state text,
  postal_code text,

  country text not null default 'India',

  phone text,
  email text,

  is_primary boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint restaurant_outlets_name_length
    check (char_length(name) between 2 and 150),

  constraint restaurant_outlets_city_length
    check (char_length(city) between 2 and 100),

  constraint restaurant_outlets_address_length
    check (
      address_line1 is null
      or char_length(address_line1) <= 300
    ),

  constraint restaurant_outlets_address2_length
    check (
      address_line2 is null
      or char_length(address_line2) <= 300
    ),

  constraint restaurant_outlets_landmark_length
    check (
      landmark is null
      or char_length(landmark) <= 150
    ),

  constraint restaurant_outlets_state_length
    check (
      state is null
      or char_length(state) <= 100
    ),

  constraint restaurant_outlets_postal_code_length
    check (
      postal_code is null
      or char_length(postal_code) <= 20
    ),

  constraint restaurant_outlets_country_length
    check (char_length(country) between 2 and 100),

  constraint restaurant_outlets_phone_length
    check (
      phone is null
      or char_length(phone) <= 30
    ),

  constraint restaurant_outlets_email_length
    check (
      email is null
      or char_length(email) <= 254
    )
);

-- 3. Indexes.

create index restaurant_outlets_restaurant_idx
  on public.restaurant_outlets(restaurant_id);

create index restaurant_outlets_city_idx
  on public.restaurant_outlets(city);

create unique index restaurant_outlets_one_primary_idx
  on public.restaurant_outlets(restaurant_id)
  where is_primary = true;

-- 4. Updated-at trigger.

create trigger restaurant_outlets_updated_at
before update on public.restaurant_outlets
for each row execute function public.set_updated_at();

-- 5. Backfill existing restaurants.
-- Existing applications receive a primary outlet using
-- their existing restaurant name and city.
-- Address details remain null until completed.

insert into public.restaurant_outlets (
  restaurant_id,
  name,
  city,
  is_primary
)
select
  r.id,
  r.name,
  r.city,
  true
from public.restaurants r
where not exists (
  select 1
  from public.restaurant_outlets o
  where o.restaurant_id = r.id
);

-- 6. Enable Row Level Security.

alter table public.restaurant_outlets
  enable row level security;

-- 7. Remove default privileges.

revoke all privileges
on public.restaurant_outlets
from public, anon, authenticated;

-- 8. Authorized reads only.
-- Active restaurant members and admins can read outlets.
-- No direct client-side writes are granted.

grant select
on public.restaurant_outlets
to authenticated;

create policy "Restaurant members can view their outlets"
on public.restaurant_outlets
for select
to authenticated
using (
  (select public.is_restaurant_member(restaurant_id))
  or (select public.is_admin())
);

-- 9. Document the table.

comment on table public.restaurant_outlets is
  'Private physical restaurant locations belonging to a restaurant business. Outlet addresses and contact information are not public job listing data.';

comment on column public.restaurant_outlets.is_primary is
  'Indicates the primary outlet for the restaurant business. A restaurant can have only one primary outlet.';

commit;
