import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type EmploymentRecord = {
  id: string;
  employer_name: string;
  job_title: string;
  department: string | null;
  employment_type: string | null;
  city: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  responsibilities: string | null;
};

type LanguageRecord = {
  id: string;
  language: string;
  proficiency: string;
};

type PreferenceRecord = {
  preferred_roles: string[] | null;
  preferred_departments: string[] | null;
  employment_types: string[] | null;
  minimum_salary: number | null;
  maximum_salary: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  availability_status: string | null;
  available_from: string | null;
  notice_period_days: number | null;
};

type ResumeRecord = {
  id: string;
  original_file_name: string;
  storage_path: string;
  file_size_bytes: number;
  verification_status: string;
  created_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "Present";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function formatSalary(value: number | null, currency: string | null) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function pretty(value: string | null | undefined) {
  if (!value) return "Not specified";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-foreground">
        {value === null || value === undefined || value === "" ? "Not specified" : value}
      </p>
    </div>
  );
}

function TagList({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="rounded-full border border-border bg-surface-muted px-3 py-2 text-xs font-medium"
        >
          {item}
        </span>
      ))}
    </div>
  ) : (
    <p className="mt-3 text-sm text-muted">{empty}</p>
  );
}

async function CandidateDashboardContent() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  const { data: roleRecords, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) {
    console.error("Candidate role query failed:", roleError);
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <section className="w-full max-w-md rounded-3xl border border-border bg-surface p-8">
          <h1 className="text-xl font-semibold">Unable to verify your account</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            We couldn&apos;t verify your account permissions. Please try again.
          </p>
          <Link href="/" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white">
            Return home
          </Link>
        </section>
      </main>
    );
  }

  const roles = (roleRecords ?? []).map((record) => record.role);

  if (roles.includes("admin")) redirect("/ops");

  if (roles.includes("candidate") && roles.includes("restaurant_staff")) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
        <section className="w-full max-w-lg rounded-3xl border border-border bg-surface p-8 shadow-sm">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm text-white">
              A
            </span>
            Apronly
          </Link>
          <p className="mt-10 text-sm font-medium text-sage">WELCOME BACK</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Choose your workspace</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Your account has access to both workspaces. Where would you like to continue?
          </p>
          <div className="mt-8 space-y-4">
            <Link href="/partner" className="flex items-center justify-between rounded-2xl border border-border p-5 transition hover:border-accent hover:bg-surface-muted">
              <div>
                <p className="font-semibold">Restaurant workspace</p>
                <p className="mt-1 text-sm text-muted">Manage your restaurant and hiring requirements.</p>
              </div>
              <span aria-hidden="true" className="text-xl">→</span>
            </Link>
            <Link href="/app" className="flex items-center justify-between rounded-2xl border border-border p-5 transition hover:border-accent hover:bg-surface-muted">
              <div>
                <p className="font-semibold">Candidate workspace</p>
                <p className="mt-1 text-sm text-muted">Manage your professional profile and career.</p>
              </div>
              <span aria-hidden="true" className="text-xl">→</span>
            </Link>
          </div>
          <p className="mt-7 text-center text-xs text-muted">
            One account. Two workspaces. Your permissions remain separate.
          </p>
        </section>
      </main>
    );
  }

  if (!roles.includes("candidate")) {
    if (roles.includes("restaurant_staff")) redirect("/partner");
    redirect("/onboarding/candidate");
  }

  const [
    profileResult,
    accountResult,
    preferencesResult,
    employmentResult,
    languagesResult,
    documentsResult,
  ] = await Promise.all([
    supabase
      .from("candidate_profiles")
      .select("city, preferred_cities, skills, experience_years, current_position, employment_status, bio")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, phone, avatar_url, verification_status")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("candidate_job_preferences")
      .select("preferred_roles, preferred_departments, employment_types, minimum_salary, maximum_salary, salary_currency, salary_period, availability_status, available_from, notice_period_days")
      .eq("candidate_id", user.id)
      .maybeSingle(),
    supabase
      .from("candidate_employment_history")
      .select("id, employer_name, job_title, department, employment_type, city, start_date, end_date, is_current, responsibilities")
      .eq("candidate_id", user.id)
      .order("start_date", { ascending: false }),
    supabase
      .from("candidate_languages")
      .select("id, language, proficiency")
      .eq("candidate_id", user.id)
      .order("language"),
    supabase
      .from("candidate_documents")
      .select("id, original_file_name, storage_path, file_size_bytes, verification_status, created_at")
      .eq("candidate_id", user.id)
      .eq("document_type", "resume")
      .order("created_at", { ascending: false }),
  ]);

  if (profileResult.error) {
    console.error("Candidate profile query failed:", profileResult.error);
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <section className="w-full max-w-md rounded-3xl border border-border bg-surface p-8">
          <h1 className="text-xl font-semibold">Unable to load your profile</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Your account is verified, but we couldn&apos;t retrieve your candidate profile. Please try again later.
          </p>
        </section>
      </main>
    );
  }

  if (!profileResult.data) redirect("/onboarding/candidate");

  for (const [label, error] of [
    ["account", accountResult.error],
    ["job preferences", preferencesResult.error],
    ["employment history", employmentResult.error],
    ["languages", languagesResult.error],
    ["documents", documentsResult.error],
  ] as const) {
    if (error) console.error(`Candidate ${label} query failed:`, error);
  }

  const profile = profileResult.data;
  const account = accountResult.data;
  const preferences = preferencesResult.data as PreferenceRecord | null;
  const employment = (employmentResult.data ?? []) as EmploymentRecord[];
  const languages = (languagesResult.data ?? []) as LanguageRecord[];
  const resumes = (documentsResult.data ?? []) as ResumeRecord[];

  const fullName =
    account?.full_name?.trim() ||
    user.user_metadata?.full_name?.toString().trim() ||
    "Candidate";
  const skills = profile.skills ?? [];
  const preferredCities = profile.preferred_cities ?? [];
  const verificationStatus = account?.verification_status ?? "unverified";

  const completionChecks = [
    Boolean(account?.full_name),
    Boolean(account?.phone),
    Boolean(profile.city),
    Boolean(profile.bio),
    Boolean(profile.current_position),
    skills.length > 0,
    preferredCities.length > 0,
    employment.length > 0,
    languages.length > 0,
    Boolean(preferences?.preferred_roles?.length),
    resumes.length > 0,
  ];
  const completion = Math.round(
    (completionChecks.filter(Boolean).length / completionChecks.length) * 100,
  );

  const latestResume = resumes[0];
  let resumeUrl: string | null = null;
  if (latestResume?.storage_path) {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("candidate-documents")
      .createSignedUrl(latestResume.storage_path, 60 * 5);
    if (signedUrlError) {
      console.error("Resume signed URL creation failed:", signedUrlError);
    } else {
      resumeUrl = signedUrlData.signedUrl;
    }
  }

  const minSalary = formatSalary(
    preferences?.minimum_salary ?? null,
    preferences?.salary_currency ?? "INR",
  );
  const maxSalary = formatSalary(
    preferences?.maximum_salary ?? null,
    preferences?.salary_currency ?? "INR",
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm text-white">A</span>
            Apronly
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">Candidate workspace</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-surface-muted">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="py-10 sm:py-12">
          <p className="text-sm font-medium text-sage">CANDIDATE WORKSPACE</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Welcome, {fullName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Your professional profile brings your hospitality experience, skills and career preferences together.
                Keep it accurate so Apronly can connect you with relevant opportunities.
              </p>
            </div>
            <Link href="/onboarding/candidate" className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition hover:opacity-90">
              Edit profile
            </Link>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-muted">PROFILE COMPLETENESS</p>
                <p className="mt-3 text-4xl font-semibold tabular-nums">{completion}%</p>
                <p className="mt-2 text-sm text-muted">Complete the missing sections to strengthen your profile.</p>
              </div>
              <span className="rounded-full bg-surface-muted px-3 py-2 text-xs font-medium">{pretty(verificationStatus)}</span>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Detail label="Email" value={user.email ?? "Not available"} />
              <Detail label="Phone" value={account?.phone} />
              <Detail label="Current city" value={profile.city} />
              <Detail label="Experience" value={`${profile.experience_years ?? 0} years`} />
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-7">
            <p className="text-xs font-semibold tracking-wider text-muted">CAREER SNAPSHOT</p>
            <h2 className="mt-3 text-xl font-semibold">{profile.current_position || "Add your current role"}</h2>
            <p className="mt-2 text-sm text-muted">{pretty(profile.employment_status)}</p>
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs text-muted">Preferred locations</p>
              <TagList items={preferredCities} empty="No preferred cities added yet." />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Personal introduction</h2>
              <Link href="/onboarding/candidate" className="text-xs font-medium text-sage hover:underline">Edit</Link>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted">
              {profile.bio || "Add a short introduction about your hospitality background and strengths."}
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold">Skills & expertise</h2>
            <TagList items={skills} empty="Add your hospitality skills to help employers understand your strengths." />
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-border bg-surface p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted">WORK HISTORY</p>
              <h2 className="mt-2 text-lg font-semibold">Professional experience</h2>
            </div>
            <Link href="/onboarding/candidate" className="text-xs font-medium text-sage hover:underline">Manage</Link>
          </div>
          {employment.length ? (
            <div className="mt-6 space-y-6">
              {employment.map((job) => (
                <article key={job.id} className="border-l-2 border-border pl-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{job.job_title}</h3>
                      <p className="mt-1 text-sm text-muted">{job.employer_name}{job.city ? ` Â· ${job.city}` : ""}</p>
                    </div>
                    <span className="text-xs text-muted">
                      {formatDate(job.start_date)} â€“ {job.is_current ? "Present" : formatDate(job.end_date)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {[job.department, job.employment_type].filter(Boolean).join(" Â· ") || "Role details"}
                  </p>
                  {job.responsibilities && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">{job.responsibilities}</p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No employment history added yet.</p>
          )}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold">Languages</h2>
            {languages.length ? (
              <div className="mt-4 divide-y divide-border">
                {languages.map((language) => (
                  <div key={language.id} className="flex items-center justify-between gap-4 py-3">
                    <span className="text-sm font-medium">{language.language}</span>
                    <span className="rounded-full bg-surface-muted px-3 py-1.5 text-xs text-muted">{pretty(language.proficiency)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">No languages added yet.</p>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold">Resume & documents</h2>
            {latestResume ? (
              <div className="mt-4 rounded-2xl border border-border p-4">
                <p className="break-all text-sm font-medium">{latestResume.original_file_name}</p>
                <p className="mt-2 text-xs text-muted">
                  {(latestResume.file_size_bytes / 1024).toFixed(1)} KB Â· {pretty(latestResume.verification_status)}
                </p>
                {resumeUrl ? (
                  <a href={resumeUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted">
                    View resume
                  </a>
                ) : (
                  <p className="mt-3 text-xs text-muted">Resume preview is temporarily unavailable.</p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">No resume uploaded yet.</p>
            )}
            <Link href="/onboarding/candidate" className="mt-4 inline-flex text-sm font-medium text-sage hover:underline">
              Manage documents
            </Link>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-border bg-surface p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted">JOB PREFERENCES</p>
              <h2 className="mt-2 text-lg font-semibold">What you&apos;re looking for</h2>
            </div>
            <Link href="/onboarding/candidate" className="text-xs font-medium text-sage hover:underline">Edit preferences</Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-muted">Preferred roles</p>
              <TagList items={preferences?.preferred_roles ?? []} empty="Not specified." />
            </div>
            <div>
              <p className="text-xs text-muted">Departments</p>
              <TagList items={preferences?.preferred_departments ?? []} empty="Not specified." />
            </div>
            <div>
              <p className="text-xs text-muted">Employment types</p>
              <TagList items={preferences?.employment_types ?? []} empty="Not specified." />
            </div>
            <Detail label="Salary range" value={minSalary || maxSalary ? `${minSalary ?? "No minimum"} â€“ ${maxSalary ?? "No maximum"} / ${preferences?.salary_period ?? "period not set"}` : "Not specified"} />
            <Detail label="Availability" value={pretty(preferences?.availability_status)} />
            <Detail label="Available from" value={preferences?.available_from ? formatDate(preferences.available_from) : preferences?.notice_period_days !== null && preferences?.notice_period_days !== undefined ? `${preferences.notice_period_days} days notice` : "Not specified"} />
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-primary p-7 text-white sm:p-9">
          <p className="text-xs font-medium tracking-wider text-white/70">YOUR APRONLY PROFILE</p>
          <h2 className="mt-3 text-2xl font-semibold">Your next opportunity starts here.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            Your profile is ready to be kept up to date. Apronly&apos;s job discovery, applications and recruitment updates will become available as the platform experience expands.
          </p>
        </section>

        <footer className="mt-10 border-t border-border py-6 text-xs text-muted">
          Apronly Â· Hospitality careers, thoughtfully connected.
        </footer>
      </div>
    </main>
  );
}

export default function CandidateDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background px-5">
          <div className="text-sm text-muted">Loading your candidate workspace...</div>
        </main>
      }
    >
      <CandidateDashboardContent />
    </Suspense>
  );
}
