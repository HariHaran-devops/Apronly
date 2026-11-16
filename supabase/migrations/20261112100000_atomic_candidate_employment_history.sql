-- ============================================================
-- APRONLY: ATOMIC CANDIDATE ONBOARDING WITH EMPLOYMENT HISTORY
-- Migration: 20261112100000_atomic_candidate_employment_history.sql
-- ============================================================

-- Replace the 18-argument wrapper with a 19-argument version.
-- Employment history is validated and persisted in the same transaction
-- as the candidate profile, job preferences, and languages.
DROP FUNCTION IF EXISTS public.complete_candidate_onboarding_with_preferences(
  text, text[], text[], numeric, text, text, text,
  text[], text[], text[], numeric, numeric, text, text,
  text, date, integer, jsonb
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
  p_languages jsonb DEFAULT '[]'::jsonb,
  p_employment_history jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_candidate_id uuid;
  v_language_count integer;
  v_employment_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate languages.
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

  -- Validate employment history before changing any data.
  IF p_employment_history IS NULL
     OR jsonb_typeof(p_employment_history) <> 'array' THEN
    RAISE EXCEPTION 'Employment history must be supplied as an array';
  END IF;

  v_employment_count := jsonb_array_length(p_employment_history);
  IF v_employment_count > 20 THEN
    RAISE EXCEPTION 'You can add up to 20 employment entries';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_employment_history) AS item(value)
    WHERE
      jsonb_typeof(item.value) <> 'object'
      OR jsonb_typeof(item.value->'employer_name') IS DISTINCT FROM 'string'
      OR jsonb_typeof(item.value->'job_title') IS DISTINCT FROM 'string'
      OR jsonb_typeof(item.value->'start_date') IS DISTINCT FROM 'string'
      OR char_length(trim(item.value->>'employer_name')) NOT BETWEEN 2 AND 150
      OR char_length(trim(item.value->>'job_title')) NOT BETWEEN 2 AND 150
      OR jsonb_typeof(item.value->'start_date') <> 'string'
      OR (item.value->>'start_date') !~ '^\d{4}-\d{2}-\d{2}$'
      OR (
        item.value ? 'is_current'
        AND jsonb_typeof(item.value->'is_current') <> 'boolean'
      )
      OR (
        item.value ? 'department'
        AND item.value->'department' <> 'null'::jsonb
        AND jsonb_typeof(item.value->'department') <> 'string'
      )
      OR (
        item.value ? 'employment_type'
        AND item.value->'employment_type' <> 'null'::jsonb
        AND jsonb_typeof(item.value->'employment_type') <> 'string'
      )
      OR (
        item.value ? 'city'
        AND item.value->'city' <> 'null'::jsonb
        AND jsonb_typeof(item.value->'city') <> 'string'
      )
      OR (
        item.value ? 'responsibilities'
        AND item.value->'responsibilities' <> 'null'::jsonb
        AND jsonb_typeof(item.value->'responsibilities') <> 'string'
      )
      OR (
        item.value ? 'end_date'
        AND item.value->'end_date' <> 'null'::jsonb
        AND (
          jsonb_typeof(item.value->'end_date') <> 'string'
          OR (item.value->>'end_date') !~ '^\d{4}-\d{2}-\d{2}$'
        )
      )
      OR char_length(coalesce(item.value->>'department', '')) > 100
      OR char_length(coalesce(item.value->>'employment_type', '')) > 100
      OR char_length(coalesce(item.value->>'city', '')) > 100
      OR char_length(coalesce(item.value->>'responsibilities', '')) > 2000
      OR (
        coalesce((item.value->>'is_current')::boolean, false)
        AND item.value->'end_date' IS NOT NULL
        AND item.value->'end_date' <> 'null'::jsonb
      )
  ) THEN
    RAISE EXCEPTION 'One or more employment entries are invalid';
  END IF;

  -- Validate actual calendar dates and date ordering.
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_employment_history) AS item(value)
    WHERE
      (item.value->>'start_date')::date IS NULL
      OR (
        item.value->'end_date' IS NOT NULL
        AND item.value->'end_date' <> 'null'::jsonb
        AND (item.value->>'end_date')::date < (item.value->>'start_date')::date
      )
  ) THEN
    RAISE EXCEPTION 'Employment end dates cannot be earlier than start dates';
  END IF;

  -- Existing trusted onboarding functions derive identity from auth.uid().
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

  DELETE FROM public.candidate_employment_history
  WHERE candidate_id = v_candidate_id;

  INSERT INTO public.candidate_employment_history (
    candidate_id,
    employer_name,
    job_title,
    department,
    employment_type,
    city,
    start_date,
    end_date,
    is_current,
    responsibilities
  )
  SELECT
    v_candidate_id,
    trim(item.value->>'employer_name'),
    trim(item.value->>'job_title'),
    nullif(trim(item.value->>'department'), ''),
    nullif(trim(item.value->>'employment_type'), ''),
    nullif(trim(item.value->>'city'), ''),
    (item.value->>'start_date')::date,
    CASE
      WHEN item.value->'end_date' IS NULL
        OR item.value->'end_date' = 'null'::jsonb THEN NULL
      ELSE (item.value->>'end_date')::date
    END,
    coalesce((item.value->>'is_current')::boolean, false),
    nullif(trim(item.value->>'responsibilities'), '')
  FROM jsonb_array_elements(p_employment_history) AS item(value);

  RETURN v_candidate_id;
END;
$$;

REVOKE ALL ON FUNCTION
  public.complete_candidate_onboarding_with_preferences(
    text, text[], text[], numeric, text, text, text,
    text[], text[], text[], numeric, numeric, text, text,
    text, date, integer, jsonb, jsonb
  )
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.complete_candidate_onboarding_with_preferences(
    text, text[], text[], numeric, text, text, text,
    text[], text[], text[], numeric, numeric, text, text,
    text, date, integer, jsonb, jsonb
  )
TO authenticated;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
