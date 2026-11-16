
begin;

-- ============================================================
-- APRONLY
-- Migration: Expanded Restaurant Onboarding
-- ============================================================

create or replace function public.submit_restaurant_application_v2(
  p_name text,
  p_legal_name text,
  p_description text,
  p_business_email text,
  p_business_phone text,
  p_website_url text,
  p_category text,
  p_outlet_name text,
  p_address_line1 text,
  p_address_line2 text,
  p_landmark text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_country text,
  p_outlet_phone text,
  p_outlet_email text
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
  primary_outlet_id uuid;
  generated_slug text;

  clean_name text;
  clean_legal_name text;
  clean_description text;
  clean_business_email text;
  clean_business_phone text;
  clean_website_url text;
  clean_category text;

  clean_outlet_name text;
  clean_address_line1 text;
  clean_address_line2 text;
  clean_landmark text;
  clean_city text;
  clean_state text;
  clean_postal_code text;
  clean_country text;
  clean_outlet_phone text;
  clean_outlet_email text;
begin
  -- 1. Derive identity from the authenticated session.

  current_user_id := (select auth.uid());

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- 2. Normalize input.

  clean_name := btrim(coalesce(p_name, ''));
  clean_legal_name := nullif(btrim(p_legal_name), '');
  clean_description := nullif(btrim(p_description), '');

  clean_business_email := lower(btrim(coalesce(p_business_email, '')));
  clean_business_phone := btrim(coalesce(p_business_phone, ''));
  clean_website_url := nullif(btrim(p_website_url), '');
  clean_category := btrim(coalesce(p_category, ''));

  clean_outlet_name := btrim(coalesce(p_outlet_name, ''));
  clean_address_line1 := btrim(coalesce(p_address_line1, ''));
  clean_address_line2 := nullif(btrim(p_address_line2), '');
  clean_landmark := nullif(btrim(p_landmark), '');

  clean_city := btrim(coalesce(p_city, ''));
  clean_state := btrim(coalesce(p_state, ''));
  clean_postal_code := btrim(coalesce(p_postal_code, ''));
  clean_country := btrim(coalesce(p_country, ''));

  clean_outlet_phone := nullif(btrim(p_outlet_phone), '');
  clean_outlet_email := nullif(lower(btrim(p_outlet_email)), '');

  -- 3. Validate business information.

  if char_length(clean_name) < 2
     or char_length(clean_name) > 200 then
    raise exception 'Restaurant name must be between 2 and 200 characters';
  end if;

  if clean_legal_name is not null
     and char_length(clean_legal_name) > 200 then
    raise exception 'Legal business name is too long';
  end if;

  if clean_description is not null
     and char_length(clean_description) > 2000 then
    raise exception 'Description is too long';
  end if;

  if char_length(clean_business_email) > 254
     or clean_business_email !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$' then
    raise exception 'Enter a valid business email address';
  end if;

  if char_length(clean_business_phone) < 7
     or char_length(clean_business_phone) > 30
     or clean_business_phone !~ '^[+0-9() .-]+$' then
    raise exception 'Enter a valid business phone number';
  end if;

  if clean_website_url is not null then
    if char_length(clean_website_url) > 2048
       or clean_website_url !~* '^https?://' then
      raise exception 'Website must use a valid HTTP or HTTPS URL';
    end if;
  end if;

  if char_length(clean_category) < 2
     or char_length(clean_category) > 80 then
    raise exception 'Select a valid restaurant category';
  end if;

  -- 4. Validate primary outlet information.

  if char_length(clean_outlet_name) < 2
     or char_length(clean_outlet_name) > 150 then
    raise exception 'Outlet name must be between 2 and 150 characters';
  end if;

  if char_length(clean_address_line1) < 5
     or char_length(clean_address_line1) > 300 then
    raise exception 'Enter a valid primary outlet address';
  end if;

  if clean_address_line2 is not null
     and char_length(clean_address_line2) > 300 then
    raise exception 'Address line 2 is too long';
  end if;

  if clean_landmark is not null
     and char_length(clean_landmark) > 150 then
    raise exception 'Landmark is too long';
  end if;

  if char_length(clean_city) < 2
     or char_length(clean_city) > 100 then
    raise exception 'Enter a valid outlet city';
  end if;

  if char_length(clean_state) < 2
     or char_length(clean_state) > 100 then
    raise exception 'Enter a valid state';
  end if;

  if char_length(clean_postal_code) < 3
     or char_length(clean_postal_code) > 20 then
    raise exception 'Enter a valid postal code';
  end if;

  if char_length(clean_country) < 2
     or char_length(clean_country) > 100 then
    raise exception 'Enter a valid country';
  end if;

  if clean_outlet_phone is not null
     and (
       char_length(clean_outlet_phone) < 7
       or char_length(clean_outlet_phone) > 30
       or clean_outlet_phone !~ '^[+0-9() .-]+$'
     ) then
    raise exception 'Enter a valid outlet phone number';
  end if;

  if clean_outlet_email is not null
     and (
       char_length(clean_outlet_email) > 254
       or clean_outlet_email !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$'
     ) then
    raise exception 'Enter a valid outlet email address';
  end if;

  -- 5. Verify that the authenticated account has a profile.

  if not exists (
    select 1
    from public.profiles p
    where p.id = current_user_id
  ) then
    raise exception 'Account profile not found';
  end if;

  -- 6. Serialize submissions to prevent duplicate creation.

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  -- 7. Check for an existing application.

  select r.restaurant_id
  into existing_restaurant_id
  from public.restaurant_onboarding_requests r
  where r.user_id = current_user_id;

  if existing_restaurant_id is not null then

    -- Only an active owner can complete an existing application.
    if not exists (
      select 1
      from public.restaurant_memberships rm
      where rm.restaurant_id = existing_restaurant_id
        and rm.user_id = current_user_id
        and rm.role = 'owner'::public.restaurant_member_role
        and rm.status = 'active'::public.membership_status
    ) then
      raise exception 'Restaurant owner membership could not be verified';
    end if;

    -- Never allow onboarding to modify an approved,
    -- suspended or rejected restaurant.
    if not exists (
      select 1
      from public.restaurants r
      where r.id = existing_restaurant_id
        and r.status = 'pending'::public.restaurant_status
        and r.verification_status = 'unverified'::public.verification_status
    ) then
      raise exception 'This restaurant application can no longer be edited through onboarding';
    end if;

    update public.restaurants
    set
      name = clean_name,
      legal_name = clean_legal_name,
      description = clean_description,
      city = clean_city,
      business_email = clean_business_email,
      business_phone = clean_business_phone,
      website_url = clean_website_url,
      category = clean_category
    where id = existing_restaurant_id;

    -- Find the existing primary outlet.

    select o.id
    into primary_outlet_id
    from public.restaurant_outlets o
    where o.restaurant_id = existing_restaurant_id
      and o.is_primary = true;

    if primary_outlet_id is null then

      insert into public.restaurant_outlets (
        restaurant_id,
        name,
        address_line1,
        address_line2,
        landmark,
        city,
        state,
        postal_code,
        country,
        phone,
        email,
        is_primary
      )
      values (
        existing_restaurant_id,
        clean_outlet_name,
        clean_address_line1,
        clean_address_line2,
        clean_landmark,
        clean_city,
        clean_state,
        clean_postal_code,
        clean_country,
        clean_outlet_phone,
        clean_outlet_email,
        true
      )
      returning id into primary_outlet_id;

    else

      update public.restaurant_outlets
      set
        name = clean_outlet_name,
        address_line1 = clean_address_line1,
        address_line2 = clean_address_line2,
        landmark = clean_landmark,
        city = clean_city,
        state = clean_state,
        postal_code = clean_postal_code,
        country = clean_country,
        phone = clean_outlet_phone,
        email = clean_outlet_email
      where id = primary_outlet_id;

    end if;

    insert into public.audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    )
    values (
      current_user_id,
      'restaurant_application_updated',
      'restaurant',
      existing_restaurant_id::text,
      jsonb_build_object(
        'restaurant_name', clean_name,
        'city', clean_city
      )
    );

    return existing_restaurant_id;
  end if;

  -- 8. Generate a unique URL-safe slug.

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

  -- 9. Create the restaurant business.

  insert into public.restaurants (
    name,
    legal_name,
    slug,
    description,
    city,
    business_email,
    business_phone,
    website_url,
    category,
    verification_status,
    status
  )
  values (
    clean_name,
    clean_legal_name,
    generated_slug,
    clean_description,
    clean_city,
    clean_business_email,
    clean_business_phone,
    clean_website_url,
    clean_category,
    'unverified'::public.verification_status,
    'pending'::public.restaurant_status
  )
  returning id into new_restaurant_id;

  -- 10. Create the primary outlet.

  insert into public.restaurant_outlets (
    restaurant_id,
    name,
    address_line1,
    address_line2,
    landmark,
    city,
    state,
    postal_code,
    country,
    phone,
    email,
    is_primary
  )
  values (
    new_restaurant_id,
    clean_outlet_name,
    clean_address_line1,
    clean_address_line2,
    clean_landmark,
    clean_city,
    clean_state,
    clean_postal_code,
    clean_country,
    clean_outlet_phone,
    clean_outlet_email,
    true
  );

  -- 11. Create the owner membership.

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

  -- 12. Assign the restaurant_staff role.

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

  -- 13. Store the idempotency record.

  insert into public.restaurant_onboarding_requests (
    user_id,
    restaurant_id
  )
  values (
    current_user_id,
    new_restaurant_id
  );

  -- 14. Record the submission.

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
      'category', clean_category,
      'status', 'pending'
    )
  );

  return new_restaurant_id;
end;
$$;

-- ============================================================
-- FUNCTION EXECUTION PERMISSIONS
-- ============================================================

revoke all on function public.submit_restaurant_application_v2(
  text, text, text, text, text, text, text,
  text, text, text, text, text, text, text,
  text, text, text
)
from public, anon, authenticated;

grant execute on function public.submit_restaurant_application_v2(
  text, text, text, text, text, text, text,
  text, text, text, text, text, text, text,
  text, text, text
)
to authenticated;

comment on function public.submit_restaurant_application_v2(
  text, text, text, text, text, text, text,
  text, text, text, text, text, text, text,
  text, text, text
) is
'Creates or completes a pending restaurant application for the authenticated user, including business information and its primary outlet.';

commit;
