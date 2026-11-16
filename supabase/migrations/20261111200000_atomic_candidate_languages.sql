-- ============================================================
-- APRONLY: ATOMIC CANDIDATE ONBOARDING WITH LANGUAGES
-- Migration: 20261111200000_atomic_candidate_languages.sql
-- ============================================================

-- Replace the previous 17-argument wrapper with an 18-argument
-- version that also saves candidate languages.
DROP FUNCTION IF EXISTS public.complete_candidate_onboarding_with_preferences(
  text, text[], text[], numeric, text, text, text,
  text[], text[], text[], numeric, numeric, text, text,
  text, date, integer
);

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
  p_notice_period_days integer DEFAULT NULL,
  p_languages jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_candidate_id uuid;
  v_language_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_languages IS NULL OR jsonb_typeof(p_languages) <> 'array' THEN
    RAISE EXCEPTION 'Languages must be supplied as an array';
  END IF;

  v_language_count := jsonb_array_length(p_languages);

  IF v_language_count > 20 THEN
    RAISE EXCEPTION 'You can add up to 20 languages';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_languages) AS item(value)
    WHERE
      jsonb_typeof(item.value) <> 'object'
      OR jsonb_typeof(item.value->'language') IS DISTINCT FROM 'string'
      OR jsonb_typeof(item.value->'proficiency') IS DISTINCT FROM 'string'
      OR char_length(trim(item.value->>'language')) NOT BETWEEN 2 AND 60
      OR lower(trim(item.value->>'proficiency')) NOT IN (
        'basic', 'conversational', 'professional', 'fluent', 'native'
      )
  ) THEN
    RAISE EXCEPTION 'One or more language entries are invalid';
  END IF;

  IF EXISTS (
    SELECT lower(trim(item.value->>'language'))
    FROM jsonb_array_elements(p_languages) AS item(value)
    GROUP BY lower(trim(item.value->>'language'))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate languages are not allowed';
  END IF;

  v_candidate_id := public.complete_candidate_onboarding(
    p_city,
    p_preferred_cities,
    p_skills,
    p_experience_years,
    p_current_position,
    p_employment_status,
    p_bio
  );

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

  DELETE FROM public.candidate_languages
  WHERE candidate_id = v_candidate_id;

  INSERT INTO public.candidate_languages (
    candidate_id,
    language,
    proficiency
  )
  SELECT
    v_candidate_id,
    trim(item.value->>'language'),
    lower(trim(item.value->>'proficiency'))
  FROM jsonb_array_elements(p_languages) AS item(value);

  RETURN v_candidate_id;
END;
$$;

REVOKE ALL ON FUNCTION
  public.complete_candidate_onboarding_with_preferences(
    text, text[], text[], numeric, text, text, text,
    text[], text[], text[], numeric, numeric, text, text,
    text, date, integer, jsonb
  )
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.complete_candidate_onboarding_with_preferences(
    text, text[], text[], numeric, text, text, text,
    text[], text[], text[], numeric, numeric, text, text,
    text, date, integer, jsonb
  )
TO authenticated;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
