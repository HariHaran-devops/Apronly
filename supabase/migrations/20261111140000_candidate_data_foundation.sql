-- ============================================================
-- APRONLY: CANDIDATE DATA FOUNDATION
-- Employment history, job preferences, languages and documents
-- ============================================================

-- ------------------------------------------------------------
-- 1. EMPLOYMENT HISTORY
-- Optional: supports experienced candidates and career changers.
-- ------------------------------------------------------------

create table public.candidate_employment_history (
  id uuid primary key default gen_random_uuid(),

  candidate_id uuid not null
    references public.candidate_profiles(id) on delete cascade,

  employer_name text not null,
  job_title text not null,
  department text,
  employment_type text,
  city text,

  start_date date not null,
  end_date date,
  is_current boolean not null default false,

  responsibilities text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint employment_employer_length
    check (char_length(trim(employer_name)) between 2 and 150),

  constraint employment_job_title_length
    check (char_length(trim(job_title)) between 2 and 150),

  constraint employment_department_length
    check (department is null or char_length(department) <= 100),

  constraint employment_city_length
    check (city is null or char_length(city) <= 100),

  constraint employment_responsibilities_length
    check (responsibilities is null or char_length(responsibilities) <= 2000),

  constraint employment_dates_valid
    check (end_date is null or end_date >= start_date),

  constraint employment_current_has_no_end_date
    check (not is_current or end_date is null)
);

create index candidate_employment_history_candidate_idx
  on public.candidate_employment_history(candidate_id);

create trigger candidate_employment_history_updated_at
before update on public.candidate_employment_history
for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 2. JOB PREFERENCES
-- One preference record per candidate.
-- Salary expectations always include their pay period.
-- ------------------------------------------------------------

create table public.candidate_job_preferences (
  candidate_id uuid primary key
    references public.candidate_profiles(id) on delete cascade,

  preferred_roles text[] not null default '{}',
  preferred_departments text[] not null default '{}',
  employment_types text[] not null default '{}',

  minimum_salary numeric(12,2),
  maximum_salary numeric(12,2),
  salary_currency varchar(3) not null default 'INR',
  salary_period text,

  availability_status text not null default 'flexible',
  available_from date,
  notice_period_days integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint job_preferences_roles_count
    check (cardinality(preferred_roles) <= 20),

  constraint job_preferences_departments_count
    check (cardinality(preferred_departments) <= 20),

  constraint job_preferences_employment_types_count
    check (cardinality(employment_types) <= 10),

  constraint job_preferences_min_salary
    check (minimum_salary is null or minimum_salary >= 0),

  constraint job_preferences_max_salary
    check (maximum_salary is null or maximum_salary >= 0),

  constraint job_preferences_salary_range
    check (
      minimum_salary is null
      or maximum_salary is null
      or minimum_salary <= maximum_salary
    ),

  constraint job_preferences_currency
    check (salary_currency ~ '^[A-Z]{3}$'),

  constraint job_preferences_salary_period
    check (
      salary_period is null
      or salary_period in ('hourly', 'daily', 'weekly', 'monthly', 'yearly')
    ),

  constraint job_preferences_salary_requires_period
    check (
      (minimum_salary is null and maximum_salary is null)
      or salary_period is not null
    ),

  constraint job_preferences_availability
    check (
      availability_status in (
        'immediate',
        'notice_period',
        'specific_date',
        'flexible'
      )
    ),

  constraint job_preferences_notice_days
    check (
      notice_period_days is null
      or notice_period_days between 0 and 365
    ),

  constraint job_preferences_availability_details
    check (
      (availability_status <> 'notice_period' or notice_period_days is not null)
      and
      (availability_status <> 'specific_date' or available_from is not null)
    )
);

create trigger candidate_job_preferences_updated_at
before update on public.candidate_job_preferences
for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 3. CANDIDATE LANGUAGES
-- ------------------------------------------------------------

create table public.candidate_languages (
  id uuid primary key default gen_random_uuid(),

  candidate_id uuid not null
    references public.candidate_profiles(id) on delete cascade,

  language text not null,
  proficiency text not null,

  created_at timestamptz not null default now(),

  constraint candidate_language_length
    check (char_length(trim(language)) between 2 and 60),

  constraint candidate_language_proficiency
    check (
      proficiency in (
        'basic',
        'conversational',
        'professional',
        'fluent',
        'native'
      )
    )
);

create unique index candidate_languages_unique_per_candidate
  on public.candidate_languages(candidate_id, lower(trim(language)));

create index candidate_languages_candidate_idx
  on public.candidate_languages(candidate_id);


-- ------------------------------------------------------------
-- 4. CANDIDATE DOCUMENT METADATA
-- Actual files are stored in private Supabase Storage.
-- ------------------------------------------------------------

create table public.candidate_documents (
  id uuid primary key default gen_random_uuid(),

  candidate_id uuid not null
    references public.candidate_profiles(id) on delete cascade,

  document_type text not null,
  storage_path text not null unique,

  original_file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null,

  verification_status public.verification_status
    not null default 'unverified',

  created_at timestamptz not null default now(),

  constraint candidate_document_type
    check (
      document_type in (
        'resume',
        'certificate',
        'identity_document',
        'other'
      )
    ),

  constraint candidate_document_filename_length
    check (char_length(original_file_name) between 1 and 255),

  constraint candidate_document_mime_type
    check (
      mime_type in (
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
      )
    ),

  constraint candidate_document_file_size
    check (file_size_bytes between 1 and 10485760),

  constraint candidate_document_storage_path
    check (
      storage_path like candidate_id::text || '/%'
      and char_length(storage_path) <= 500
    )
);

create index candidate_documents_candidate_idx
  on public.candidate_documents(candidate_id);

create index candidate_documents_type_idx
  on public.candidate_documents(candidate_id, document_type);


-- ------------------------------------------------------------
-- 5. ENABLE ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.candidate_employment_history
  enable row level security;

alter table public.candidate_job_preferences
  enable row level security;

alter table public.candidate_languages
  enable row level security;

alter table public.candidate_documents
  enable row level security;


-- ------------------------------------------------------------
-- 6. EMPLOYMENT HISTORY POLICIES
-- Candidate and authorized administrators only.
-- ------------------------------------------------------------

create policy "Candidates manage their employment history"
on public.candidate_employment_history
for all
to authenticated
using (
  candidate_id = (select auth.uid())
  or (select public.is_admin())
)
with check (
  candidate_id = (select auth.uid())
  or (select public.is_admin())
);


-- ------------------------------------------------------------
-- 7. JOB PREFERENCES POLICIES
-- ------------------------------------------------------------

create policy "Candidates manage their job preferences"
on public.candidate_job_preferences
for all
to authenticated
using (
  candidate_id = (select auth.uid())
  or (select public.is_admin())
)
with check (
  candidate_id = (select auth.uid())
  or (select public.is_admin())
);


-- ------------------------------------------------------------
-- 8. LANGUAGE POLICIES
-- ------------------------------------------------------------

create policy "Candidates manage their languages"
on public.candidate_languages
for all
to authenticated
using (
  candidate_id = (select auth.uid())
  or (select public.is_admin())
)
with check (
  candidate_id = (select auth.uid())
  or (select public.is_admin())
);


-- ------------------------------------------------------------
-- 9. DOCUMENT METADATA POLICIES
-- Candidates can insert their own unverified documents.
-- Admins can read documents for authorized review.
-- Candidate document verification is server-controlled.
-- ------------------------------------------------------------

create policy "Candidates and admins can view candidate documents"
on public.candidate_documents
for select
to authenticated
using (
  candidate_id = (select auth.uid())
  or (select public.is_admin())
);

create policy "Candidates can register their own documents"
on public.candidate_documents
for insert
to authenticated
with check (
  candidate_id = (select auth.uid())
  and verification_status = 'unverified'
  and storage_path like (select auth.uid())::text || '/%'
);


-- ------------------------------------------------------------
-- 10. MINIMUM TABLE PRIVILEGES
-- ------------------------------------------------------------

revoke all privileges on public.candidate_employment_history
  from anon, authenticated;

revoke all privileges on public.candidate_job_preferences
  from anon, authenticated;

revoke all privileges on public.candidate_languages
  from anon, authenticated;

revoke all privileges on public.candidate_documents
  from anon, authenticated;

grant select, insert, update, delete
  on public.candidate_employment_history to authenticated;

grant select, insert, update, delete
  on public.candidate_job_preferences to authenticated;

grant select, insert, update, delete
  on public.candidate_languages to authenticated;

grant select, insert
  on public.candidate_documents to authenticated;


-- ------------------------------------------------------------
-- 11. PRIVATE CANDIDATE DOCUMENT STORAGE BUCKET
-- Maximum file size: 10 MB.
-- ------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'candidate-documents',
  'candidate-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
);


-- ------------------------------------------------------------
-- 12. STORAGE OBJECT POLICIES
-- Object path format: {candidate_uuid}/{unique_file_name}
-- No restaurant access is granted.
-- ------------------------------------------------------------

create policy "Candidates can view their own documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'candidate-documents'
  and (
    split_part(name, '/', 1) = (select auth.uid())::text
    or (select public.is_admin())
  )
);

create policy "Candidates can upload their own documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'candidate-documents'
  and split_part(name, '/', 1) = (select auth.uid())::text
);

create policy "Candidates can update their own documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'candidate-documents'
  and split_part(name, '/', 1) = (select auth.uid())::text
)
with check (
  bucket_id = 'candidate-documents'
  and split_part(name, '/', 1) = (select auth.uid())::text
);

create policy "Candidates can delete their own documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'candidate-documents'
  and split_part(name, '/', 1) = (select auth.uid())::text
);



-- ============================================================
-- END OF MIGRATION
-- ============================================================
