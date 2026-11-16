
BEGIN;

-- ============================================================
-- APRONLY
-- Migration: Secure Restaurant Profile & Outlet Management
-- ============================================================

-- ------------------------------------------------------------
-- 1. UPDATE RESTAURANT BUSINESS PROFILE
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_restaurant_business_profile(
  p_restaurant_id uuid,
  p_name text,
  p_legal_name text,
  p_description text,
  p_business_email text,
  p_business_phone text,
  p_website_url text,
  p_category text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_name text;
  v_legal_name text;
  v_description text;
  v_business_email text;
  v_business_phone text;
  v_website_url text;
  v_category text;
  v_is_admin boolean;
BEGIN
  v_user_id := (SELECT auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurant ID is required';
  END IF;

  v_name := btrim(coalesce(p_name, ''));
  v_legal_name := nullif(btrim(p_legal_name), '');
  v_description := nullif(btrim(p_description), '');
  v_business_email := lower(btrim(coalesce(p_business_email, '')));
  v_business_phone := btrim(coalesce(p_business_phone, ''));
  v_website_url := nullif(btrim(p_website_url), '');
  v_category := btrim(coalesce(p_category, ''));

  -- Validate business details.

  IF char_length(v_name) NOT BETWEEN 2 AND 200 THEN
    RAISE EXCEPTION 'Restaurant name must be between 2 and 200 characters';
  END IF;

  IF v_legal_name IS NOT NULL
     AND char_length(v_legal_name) > 200 THEN
    RAISE EXCEPTION 'Legal business name is too long';
  END IF;

  IF v_description IS NOT NULL
     AND char_length(v_description) > 2000 THEN
    RAISE EXCEPTION 'Description is too long';
  END IF;

  IF char_length(v_business_email) > 254
     OR v_business_email !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Enter a valid business email address';
  END IF;

  IF char_length(v_business_phone) NOT BETWEEN 7 AND 30
     OR v_business_phone !~ '^[+0-9() .-]+$' THEN
    RAISE EXCEPTION 'Enter a valid business phone number';
  END IF;

  IF v_website_url IS NOT NULL
     AND (
       char_length(v_website_url) > 2048
       OR v_website_url !~* '^https?://'
     ) THEN
    RAISE EXCEPTION 'Website must use a valid HTTP or HTTPS URL';
  END IF;

  IF char_length(v_category) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION 'Select a valid restaurant category';
  END IF;

  v_is_admin := (SELECT public.is_admin());

  -- Owners must have active membership.
  -- Admins can perform administrative updates.

  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1
    FROM public.restaurant_memberships rm
    WHERE rm.restaurant_id = p_restaurant_id
      AND rm.user_id = v_user_id
      AND rm.role = 'owner'::public.restaurant_member_role
      AND rm.status = 'active'::public.membership_status
  ) THEN
    RAISE EXCEPTION 'Active restaurant owner membership required';
  END IF;

  -- Only approved and verified restaurants can use
  -- normal business management operations.

  IF NOT EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = p_restaurant_id
      AND r.status = 'active'::public.restaurant_status
      AND r.verification_status = 'verified'::public.verification_status
  ) THEN
    RAISE EXCEPTION 'Restaurant must be active and verified';
  END IF;

  UPDATE public.restaurants
  SET
    name = v_name,
    legal_name = v_legal_name,
    description = v_description,
    business_email = v_business_email,
    business_phone = v_business_phone,
    website_url = v_website_url,
    category = v_category
  WHERE id = p_restaurant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Restaurant not found';
  END IF;

  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    v_user_id,
    'restaurant_business_profile_updated',
    'restaurant',
    p_restaurant_id::text,
    jsonb_build_object(
      'restaurant_name', v_name,
      'category', v_category
    )
  );
END;
$$;


-- ------------------------------------------------------------
-- 2. CREATE OR UPDATE RESTAURANT OUTLET
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.save_restaurant_outlet(
  p_restaurant_id uuid,
  p_outlet_id uuid,
  p_name text,
  p_city text,
  p_address_line1 text,
  p_address_line2 text,
  p_landmark text,
  p_state text,
  p_postal_code text,
  p_country text,
  p_phone text,
  p_email text,
  p_is_primary boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_outlet_id uuid;
  v_name text;
  v_city text;
  v_address_line1 text;
  v_address_line2 text;
  v_landmark text;
  v_state text;
  v_postal_code text;
  v_country text;
  v_phone text;
  v_email text;
  v_is_primary boolean;
  v_is_admin boolean;
BEGIN
  v_user_id := (SELECT auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurant ID is required';
  END IF;

  -- Normalize input.

  v_name := btrim(coalesce(p_name, ''));
  v_city := btrim(coalesce(p_city, ''));
  v_address_line1 := btrim(coalesce(p_address_line1, ''));
  v_address_line2 := nullif(btrim(p_address_line2), '');
  v_landmark := nullif(btrim(p_landmark), '');
  v_state := btrim(coalesce(p_state, ''));
  v_postal_code := btrim(coalesce(p_postal_code, ''));
  v_country := btrim(coalesce(p_country, ''));
  v_phone := nullif(btrim(p_phone), '');
  v_email := nullif(lower(btrim(p_email)), '');

  -- Validate outlet fields.

  IF char_length(v_name) NOT BETWEEN 2 AND 150 THEN
    RAISE EXCEPTION 'Outlet name must be between 2 and 150 characters';
  END IF;

  IF char_length(v_city) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'Enter a valid outlet city';
  END IF;

  IF char_length(v_address_line1) NOT BETWEEN 5 AND 300 THEN
    RAISE EXCEPTION 'Enter a valid outlet address';
  END IF;

  IF v_address_line2 IS NOT NULL
     AND char_length(v_address_line2) > 300 THEN
    RAISE EXCEPTION 'Address line 2 is too long';
  END IF;

  IF v_landmark IS NOT NULL
     AND char_length(v_landmark) > 150 THEN
    RAISE EXCEPTION 'Landmark is too long';
  END IF;

  IF char_length(v_state) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'Enter a valid state';
  END IF;

  IF char_length(v_postal_code) NOT BETWEEN 3 AND 20 THEN
    RAISE EXCEPTION 'Enter a valid postal code';
  END IF;

  IF char_length(v_country) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'Enter a valid country';
  END IF;

  IF v_phone IS NOT NULL
     AND (
       char_length(v_phone) NOT BETWEEN 7 AND 30
       OR v_phone !~ '^[+0-9() .-]+$'
     ) THEN
    RAISE EXCEPTION 'Enter a valid outlet phone number';
  END IF;

  IF v_email IS NOT NULL
     AND (
       char_length(v_email) > 254
       OR v_email !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$'
     ) THEN
    RAISE EXCEPTION 'Enter a valid outlet email address';
  END IF;

  v_is_admin := (SELECT public.is_admin());

  -- Verify owner membership or admin access.

  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1
    FROM public.restaurant_memberships rm
    WHERE rm.restaurant_id = p_restaurant_id
      AND rm.user_id = v_user_id
      AND rm.role = 'owner'::public.restaurant_member_role
      AND rm.status = 'active'::public.membership_status
  ) THEN
    RAISE EXCEPTION 'Active restaurant owner membership required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = p_restaurant_id
      AND r.status = 'active'::public.restaurant_status
      AND r.verification_status = 'verified'::public.verification_status
  ) THEN
    RAISE EXCEPTION 'Restaurant must be active and verified';
  END IF;

  -- Serialize outlet changes for this restaurant.
  -- This protects the one-primary-outlet rule.

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_restaurant_id::text, 0)
  );

  -- Ensure that the first outlet is primary.

  v_is_primary :=
    coalesce(p_is_primary, false)
    OR NOT EXISTS (
      SELECT 1
      FROM public.restaurant_outlets ro
      WHERE ro.restaurant_id = p_restaurant_id
        AND ro.is_primary = true
        AND (p_outlet_id IS NULL OR ro.id <> p_outlet_id)
    );

  -- If setting this outlet as primary,
  -- clear the previous primary designation.

  IF v_is_primary THEN
    UPDATE public.restaurant_outlets
    SET is_primary = false
    WHERE restaurant_id = p_restaurant_id
      AND is_primary = true
      AND (p_outlet_id IS NULL OR id <> p_outlet_id);
  END IF;

  IF p_outlet_id IS NULL THEN

    INSERT INTO public.restaurant_outlets (
      restaurant_id,
      name,
      city,
      address_line1,
      address_line2,
      landmark,
      state,
      postal_code,
      country,
      phone,
      email,
      is_primary
    )
    VALUES (
      p_restaurant_id,
      v_name,
      v_city,
      v_address_line1,
      v_address_line2,
      v_landmark,
      v_state,
      v_postal_code,
      v_country,
      v_phone,
      v_email,
      v_is_primary
    )
    RETURNING id INTO v_outlet_id;

  ELSE

    UPDATE public.restaurant_outlets
    SET
      name = v_name,
      city = v_city,
      address_line1 = v_address_line1,
      address_line2 = v_address_line2,
      landmark = v_landmark,
      state = v_state,
      postal_code = v_postal_code,
      country = v_country,
      phone = v_phone,
      email = v_email,
      is_primary = v_is_primary
    WHERE id = p_outlet_id
      AND restaurant_id = p_restaurant_id
    RETURNING id INTO v_outlet_id;

    IF v_outlet_id IS NULL THEN
      RAISE EXCEPTION 'Outlet not found for this restaurant';
    END IF;

  END IF;

  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    v_user_id,
    CASE
      WHEN p_outlet_id IS NULL
        THEN 'restaurant_outlet_created'
      ELSE 'restaurant_outlet_updated'
    END,
    'restaurant_outlet',
    v_outlet_id::text,
    jsonb_build_object(
      'restaurant_id', p_restaurant_id,
      'outlet_name', v_name,
      'city', v_city,
      'is_primary', v_is_primary
    )
  );

  RETURN v_outlet_id;
END;
$$;


-- ------------------------------------------------------------
-- 3. RESTRICT FUNCTION EXECUTION
-- ------------------------------------------------------------

REVOKE ALL ON FUNCTION
  public.update_restaurant_business_profile(
    uuid, text, text, text, text, text, text, text
  )
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.update_restaurant_business_profile(
    uuid, text, text, text, text, text, text, text
  )
TO authenticated;


REVOKE ALL ON FUNCTION
  public.save_restaurant_outlet(
    uuid, uuid, text, text, text, text, text,
    text, text, text, text, text, boolean
  )
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.save_restaurant_outlet(
    uuid, uuid, text, text, text, text, text,
    text, text, text, text, text, boolean
  )
TO authenticated;


-- ------------------------------------------------------------
-- 4. DOCUMENT FUNCTIONS
-- ------------------------------------------------------------

COMMENT ON FUNCTION
  public.update_restaurant_business_profile(
    uuid, text, text, text, text, text, text, text
  )
IS
'Securely updates an active, verified restaurant business profile for its owner or an Apronly administrator.';

COMMENT ON FUNCTION
  public.save_restaurant_outlet(
    uuid, uuid, text, text, text, text, text,
    text, text, text, text, text, boolean
  )
IS
'Securely creates or updates an outlet belonging to an active, verified restaurant. Enforces one primary outlet during serialized writes.';

COMMIT;
