
-- Migration: 20261111190000_atomic_candidate_onboarding.sql

CREATE OR REPLACE FUNCTION public.complete_candidate_onboarding_with_preferences(
  p_city text,
  p_preferred_cities text[],
  p_skills text[],
  p_experience_years numeric,
  p_current_position text,
  p_employment_status text,
  p_bio text,

  p_preferred_roles text[] DEFAULT '{}',
  p_preferred_departments text[] DEFAULT '{}',
  p_employment_types text[] DEFAULT '{}',
  p_minimum_salary numeric DEFAULT NULL,
  p_maximum_salary numeric DEFAULT NULL,
  p_salary_currency text DEFAULT 'INR',
  p_salary_period text DEFAULT NULL,
  p_availability_status text DEFAULT 'flexible',
  p_available_from date DEFAULT NULL,
  p_notice_period_days integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_candidate_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Save the candidate profile.
  v_candidate_id := public.complete_candidate_onboarding(
    p_city,
    p_preferred_cities,
    p_skills,
    p_experience_years,
    p_current_position,
    p_employment_status,
    p_bio
  );

  -- Save job preferences.
  PERFORM public.save_candidate_job_preferences(
    p_preferred_roles,
    p_preferred_departments,
    p_employment_types,
    p_minimum_salary,
    p_maximum_salary,
    p_salary_currency,
    p_salary_period,
    p_availability_status,
    p_available_from,
    p_notice_period_days
  );

  RETURN v_candidate_id;
END;
$$;

REVOKE ALL ON FUNCTION
  public.complete_candidate_onboarding_with_preferences(
    text, text[], text[], numeric, text, text, text,
    text[], text[], text[], numeric, numeric, text, text,
    text, date, integer
  )
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.complete_candidate_onboarding_with_preferences(
    text, text[], text[], numeric, text, text, text,
    text[], text[], text[], numeric, numeric, text, text,
    text, date, integer
  )
TO authenticated;
