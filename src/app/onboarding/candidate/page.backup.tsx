"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const employmentOptions = [
  "Currently employed",
  "Open to opportunities",
  "Not currently employed",
  "Student",
  "Freelancer",
];

const roleOptions = [
  "Chef", "Commis Chef", "Sous Chef", "Head Chef", "Kitchen Helper",
  "Restaurant Manager", "Assistant Restaurant Manager", "Waiter / Server",
  "Captain / Supervisor", "Host / Hostess", "Bartender", "Barista",
  "Cashier", "Steward", "Housekeeping Associate", "Front Desk Associate",
  "Hotel Operations",
];

const departmentOptions = [
  "Kitchen", "Food & Beverage Service", "Bar", "Front Office",
  "Housekeeping", "Stewarding", "Restaurant Operations",
  "Hotel Operations", "Administration",
];

const workTypeOptions = [
  "Full-time", "Part-time", "Contract", "Internship", "Temporary",
  "Apprenticeship",
];

const salaryPeriods = [
  { value: "hourly", label: "Per hour" },
  { value: "daily", label: "Per day" },
  { value: "weekly", label: "Per week" },
  { value: "monthly", label: "Per month" },
  { value: "yearly", label: "Per year" },
];

const languageProficiencies = [
  { value: "basic", label: "Basic" },
  { value: "conversational", label: "Conversational" },
  { value: "professional", label: "Professional" },
  { value: "fluent", label: "Fluent" },
  { value: "native", label: "Native" },
];

type CandidateLanguage = { language: string; proficiency: string };
type CandidateJobPreferences = {
  preferred_roles: string[] | null;
  preferred_departments: string[] | null;
  employment_types: string[] | null;
  minimum_salary: number | null;
  maximum_salary: number | null;
  salary_period: string | null;
  availability_status: string | null;
  available_from: string | null;
  notice_period_days: number | null;
};

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-accent";
const labelClass = "mb-2 block text-sm font-medium";
const cardClass = "rounded-2xl border border-border bg-surface p-6 sm:p-8";

function parseList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim().replace(/\s+/g, " "))
        .filter(Boolean),
    ),
  );
}

function SelectionGroup({
  title,
  description,
  options,
  selected,
  onToggle,
}: {
  title: string;
  description: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                active
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-background text-muted hover:border-accent"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReviewRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-0 sm:grid-cols-[150px_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-sm leading-6">{children || <span className="text-muted">Not provided</span>}</dd>
    </div>
  );
}

export default function CandidateOnboardingPage() {
  const router = useRouter();

  const [city, setCity] = useState("");
  const [preferredCities, setPreferredCities] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("0");
  const [currentPosition, setCurrentPosition] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [bio, setBio] = useState("");

  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [preferredDepartments, setPreferredDepartments] = useState<string[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);
  const [minimumSalary, setMinimumSalary] = useState("");
  const [maximumSalary, setMaximumSalary] = useState("");
  const [salaryPeriod, setSalaryPeriod] = useState("monthly");
  const [availabilityStatus, setAvailabilityStatus] = useState("flexible");
  const [availableFrom, setAvailableFrom] = useState("");
  const [noticePeriodDays, setNoticePeriodDays] = useState("");

  const [languages, setLanguages] = useState<CandidateLanguage[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSavedInformation() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const [preferencesResult, languagesResult] = await Promise.all([
          supabase
            .from("candidate_job_preferences")
            .select(
              [
                "preferred_roles",
                "preferred_departments",
                "employment_types",
                "minimum_salary",
                "maximum_salary",
                "salary_period",
                "availability_status",
                "available_from",
                "notice_period_days",
              ].join(", "),
            )
            .eq("candidate_id", user.id)
            .maybeSingle(),
          supabase
            .from("candidate_languages")
            .select("language, proficiency")
            .eq("candidate_id", user.id)
            .order("language", { ascending: true }),
        ]);

        if (preferencesResult.error) throw preferencesResult.error;
        if (languagesResult.error) throw languagesResult.error;
        if (!isMounted) return;

        const preferences =
          preferencesResult.data as unknown as CandidateJobPreferences | null;

        if (preferences) {
          setPreferredRoles(preferences.preferred_roles ?? []);
          setPreferredDepartments(preferences.preferred_departments ?? []);
          setEmploymentTypes(preferences.employment_types ?? []);
          setMinimumSalary(
            preferences.minimum_salary == null ? "" : String(preferences.minimum_salary),
          );
          setMaximumSalary(
            preferences.maximum_salary == null ? "" : String(preferences.maximum_salary),
          );
          setSalaryPeriod(preferences.salary_period ?? "monthly");
          setAvailabilityStatus(preferences.availability_status ?? "flexible");
          setAvailableFrom(preferences.available_from ?? "");
          setNoticePeriodDays(
            preferences.notice_period_days == null
              ? ""
              : String(preferences.notice_period_days),
          );
        }

        setLanguages(
          (languagesResult.data ?? []).map((item) => ({
            language: item.language,
            proficiency: item.proficiency,
          })),
        );
      } catch (error) {
        console.error("Could not load candidate preferences:", error);
        if (isMounted) {
          setErrorMessage(
            "We couldn't load your saved job preferences. Please refresh and try again.",
          );
        }
      } finally {
        if (isMounted) {
          setPreferencesLoading(false);
          setLanguagesLoading(false);
        }
      }
    }

    void loadSavedInformation();
    return () => {
      isMounted = false;
    };
  }, [router]);

  function toggleSelection(
    option: string,
    selected: string[],
    setter: (values: string[]) => void,
  ) {
    setter(
      selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option],
    );
  }

  function validateStepOne() {
    const cleanCity = city.trim().replace(/\s+/g, " ");
    const experienceValue = Number(experience);
    const cleanPreferredCities = parseList(preferredCities);
    if (cleanCity.length < 2 || cleanCity.length > 100) {
      setErrorMessage("Please enter a valid current city.");
      return false;
    }
    if (
      !Number.isFinite(experienceValue) ||
      experienceValue < 0 ||
      experienceValue > 80
    ) {
      setErrorMessage("Experience must be between 0 and 80 years.");
      return false;
    }
    if (
      cleanPreferredCities.length > 20 ||
      cleanPreferredCities.some((item) => item.length < 2 || item.length > 100)
    ) {
      setErrorMessage("Please add up to 20 preferred cities, each between 2 and 100 characters.");
      return false;
    }
    if (currentPosition.trim().length > 150) {
      setErrorMessage("Your current position must be 150 characters or fewer.");
      return false;
    }
    if (bio.trim().length > 1000) {
      setErrorMessage("Your introduction must be 1,000 characters or fewer.");
      return false;
    }
    return true;
  }

  function validateStepTwo() {
    const cleanSkills = parseList(skills);
    const cleanLanguages = languages.map((item) => ({
      language: item.language.trim().replace(/\s+/g, " "),
      proficiency: item.proficiency.trim().toLowerCase(),
    }));
    if (cleanSkills.length > 50 || cleanSkills.some((item) => item.length > 80)) {
      setErrorMessage("Please add up to 50 skills, each under 80 characters.");
      return false;
    }
    if (cleanLanguages.length > 20) {
      setErrorMessage("You can add up to 20 languages.");
      return false;
    }
    if (
      cleanLanguages.some(
        (item) =>
          item.language.length < 2 ||
          item.language.length > 60 ||
          !languageProficiencies.some((level) => level.value === item.proficiency),
      )
    ) {
      setErrorMessage("Please check each language and proficiency level.");
      return false;
    }
    const names = cleanLanguages.map((item) => item.language.toLowerCase());
    if (new Set(names).size !== names.length) {
      setErrorMessage("Please remove duplicate languages.");
      return false;
    }
    return true;
  }

  function validateStepThree() {
    if (
      preferredRoles.length > 20 ||
      preferredDepartments.length > 20 ||
      employmentTypes.length > 10
    ) {
      setErrorMessage("Please reduce your job preference selections.");
      return false;
    }

    const minSalary = minimumSalary.trim() ? Number(minimumSalary) : null;
    const maxSalary = maximumSalary.trim() ? Number(maximumSalary) : null;
    const maxAllowedSalary = 9999999999.99;

    if (
      (minSalary !== null &&
        (!Number.isFinite(minSalary) || minSalary < 0 || minSalary > maxAllowedSalary)) ||
      (maxSalary !== null &&
        (!Number.isFinite(maxSalary) || maxSalary < 0 || maxSalary > maxAllowedSalary))
    ) {
      setErrorMessage("Please enter valid salary amounts.");
      return false;
    }
    if (minSalary !== null && maxSalary !== null && minSalary > maxSalary) {
      setErrorMessage("Minimum salary cannot exceed maximum salary.");
      return false;
    }
    if (
      (minSalary !== null || maxSalary !== null) &&
      !salaryPeriods.some((period) => period.value === salaryPeriod)
    ) {
      setErrorMessage("Please select a valid salary period.");
      return false;
    }

    const noticeDays = noticePeriodDays.trim() ? Number(noticePeriodDays) : null;
    if (
      availabilityStatus === "notice_period" &&
      (noticeDays === null ||
        !Number.isInteger(noticeDays) ||
        noticeDays < 0 ||
        noticeDays > 365)
    ) {
      setErrorMessage("Enter a notice period between 0 and 365 days.");
      return false;
    }
    if (availabilityStatus === "specific_date" && !availableFrom) {
      setErrorMessage("Please select your available-from date.");
      return false;
    }
    if (
      !["immediate", "notice_period", "specific_date", "flexible"].includes(
        availabilityStatus,
      )
    ) {
      setErrorMessage("Please select a valid availability option.");
      return false;
    }
    return true;
  }

  function handleContinue() {
    setErrorMessage("");

    if (step === 1) {
      if (validateStepOne()) setStep(2);
    } else if (step === 2) {
      if (validateStepTwo()) setStep(3);
    } else if (step === 3) {
      // Step 3 only opens the review screen. It must never save or navigate.
      if (validateStepThree()) setReviewing(true);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveProfile() {
    setErrorMessage("");

    // Saving is only allowed after the candidate reaches Step 4
    // and explicitly presses "Complete my profile".
    if (!reviewing || submitting || preferencesLoading || languagesLoading) return;

    if (!validateStepOne() || !validateStepTwo() || !validateStepThree()) {
      setReviewing(false);
      if (!validateStepOne()) setStep(1);
      else if (!validateStepTwo()) setStep(2);
      else setStep(3);
      return;
    }

    const cleanCity = city.trim().replace(/\s+/g, " ");
    const cleanPreferredCities = parseList(preferredCities);
    const cleanSkills = parseList(skills);
    const experienceValue = Number(experience);
    const cleanPosition = currentPosition.trim();
    const cleanBio = bio.trim();
    const minSalary = minimumSalary.trim() ? Number(minimumSalary) : null;
    const maxSalary = maximumSalary.trim() ? Number(maximumSalary) : null;
    const hasSalaryExpectation = minSalary !== null || maxSalary !== null;
    const noticeDays = noticePeriodDays.trim() ? Number(noticePeriodDays) : null;
    const cleanLanguages = languages.map((item) => ({
      language: item.language.trim().replace(/\s+/g, " "),
      proficiency: item.proficiency.trim().toLowerCase(),
    }));

    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { error: onboardingError } = await supabase.rpc(
        "complete_candidate_onboarding_with_preferences",
        {
          p_city: cleanCity,
          p_preferred_cities: cleanPreferredCities,
          p_skills: cleanSkills,
          p_experience_years: experienceValue,
          p_current_position: cleanPosition || null,
          p_employment_status: employmentStatus || null,
          p_bio: cleanBio || null,
          p_preferred_roles: preferredRoles,
          p_preferred_departments: preferredDepartments,
          p_employment_types: employmentTypes,
          p_minimum_salary: minSalary,
          p_maximum_salary: maxSalary,
          p_salary_currency: "INR",
          p_salary_period: hasSalaryExpectation ? salaryPeriod : null,
          p_availability_status: availabilityStatus,
          p_available_from:
            availabilityStatus === "specific_date" ? availableFrom : null,
          p_notice_period_days:
            availabilityStatus === "notice_period" ? noticeDays : null,
          p_languages: cleanLanguages,
        },
      );

      if (onboardingError) throw onboardingError;
      router.replace("/auth/complete");
      router.refresh();
    } catch (error) {
      console.error("Candidate onboarding error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  }

  const loading = preferencesLoading || languagesLoading;
  const stepTitles = ["About you", "Skills & languages", "Job preferences"];

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <Link href="/" className="text-xl font-bold tracking-tight">
            apron<span className="text-accent">ly</span>
          </Link>

          <div className="mt-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
              Candidate profile · {reviewing ? "Review" : `Step ${step} of 3`}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {reviewing ? "Review your profile." : "Let’s build your profile."}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
              {reviewing
                ? "Check your information before submitting. You can go back and make changes."
                : "Tell us about your hospitality experience and the opportunities you’re looking for. Your progress is saved as you move between steps."}
            </p>
          </div>
        </header>

        <nav aria-label="Profile completion steps" className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-2">
            {stepTitles.map((title, index) => {
              const number = index + 1;
              const active = !reviewing && step === number;
              const complete = reviewing || step > number;
              return (
                <div
                  key={title}
                  aria-current={active ? "step" : undefined}
                  className="flex min-w-0 items-center gap-2"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                      active || complete
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-surface text-muted"
                    }`}
                  >
                    {complete ? "✓" : `0${number}`}
                  </span>
                  <span
                    className={`hidden text-xs font-medium sm:inline ${
                      active ? "text-foreground" : "text-muted"
                    }`}
                  >
                    {title}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${reviewing ? 100 : (step / 3) * 100}%` }}
            />
          </div>
        </nav>

        <div className="space-y-6">
          {!reviewing && step === 1 && (
            <>
              <section className={cardClass}>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent">01 · Location</p>
                  <h2 className="mt-2 text-xl font-semibold">Where are you based?</h2>
                  <p className="mt-1 text-sm text-muted">Your current location and where you would consider working.</p>
                </div>
                <div className="space-y-5">
                  <label className="block">
                    <span className={labelClass}>Current city <span className="text-danger">*</span></span>
                    <input required minLength={2} maxLength={100} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Hyderabad" className={fieldClass} />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Preferred work cities</span>
                    <input value={preferredCities} onChange={(e) => setPreferredCities(e.target.value)} placeholder="Hyderabad, Mumbai, Pune" className={fieldClass} />
                    <span className="mt-2 block text-xs text-muted">Separate multiple cities with commas. You can leave this blank.</span>
                  </label>
                </div>
              </section>

              <section className={cardClass}>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent">02 · Experience</p>
                  <h2 className="mt-2 text-xl font-semibold">Tell us about your work.</h2>
                  <p className="mt-1 text-sm text-muted">Experience counts, whether in a restaurant, hotel, café or another hospitality setting.</p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Total experience (years)</span>
                    <input type="number" min="0" max="80" step="0.5" value={experience} onChange={(e) => setExperience(e.target.value)} className={fieldClass} />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Employment status</span>
                    <select value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)} className={fieldClass}>
                      <option value="">Select status</option>
                      {employmentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                </div>
                <label className="mt-5 block">
                  <span className={labelClass}>Current or last job position</span>
                  <input maxLength={150} value={currentPosition} onChange={(e) => setCurrentPosition(e.target.value)} placeholder="e.g. Commis Chef, Restaurant Manager, Waiter" className={fieldClass} />
                </label>
              </section>

              <section className={cardClass}>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent">03 · Introduction</p>
                  <h2 className="mt-2 text-xl font-semibold">Introduce yourself.</h2>
                  <p className="mt-1 text-sm text-muted">Give employers a short overview of your professional background and strengths.</p>
                </div>
                <label className="block">
                  <span className={labelClass}>About you</span>
                  <textarea rows={5} maxLength={1000} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Share your experience, strengths and the kind of hospitality work you're interested in..." className={`${fieldClass} resize-y leading-6`} />
                  <span className="mt-2 block text-right text-xs text-muted">{bio.length}/1000</span>
                </label>
              </section>
            </>
          )}

          {!reviewing && step === 2 && (
            <>
              <section className={cardClass}>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent">04 · Skills</p>
                  <h2 className="mt-2 text-xl font-semibold">What are you good at?</h2>
                  <p className="mt-1 text-sm text-muted">Add the skills that best describe your capabilities.</p>
                </div>
                <label className="block">
                  <span className={labelClass}>Your skills</span>
                  <textarea rows={4} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Customer service, food preparation, inventory management, POS..." className={`${fieldClass} resize-y`} />
                  <span className="mt-2 block text-xs text-muted">Separate skills with commas. Add up to 50.</span>
                </label>
              </section>

              <section className={cardClass}>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent">05 · Languages</p>
                  <h2 className="mt-2 text-xl font-semibold">Which languages do you speak?</h2>
                  <p className="mt-1 text-sm text-muted">Language skills help us identify suitable hospitality opportunities.</p>
                </div>
                {languagesLoading ? (
                  <p className="text-sm text-muted">Loading your saved languages...</p>
                ) : (
                  <div className="space-y-4">
                    {languages.map((item, index) => (
                      <div key={index} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[1fr_1fr_auto]">
                        <label className="block">
                          <span className="mb-2 block text-xs font-medium text-muted">Language</span>
                          <input value={item.language} onChange={(e) => setLanguages((current) => current.map((language, i) => i === index ? { ...language, language: e.target.value } : language))} placeholder="e.g. English" className={fieldClass} />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs font-medium text-muted">Proficiency</span>
                          <select value={item.proficiency} onChange={(e) => setLanguages((current) => current.map((language, i) => i === index ? { ...language, proficiency: e.target.value } : language))} className={fieldClass}>
                            {languageProficiencies.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
                          </select>
                        </label>
                        <div className="flex items-end">
                          <button type="button" onClick={() => setLanguages((current) => current.filter((_, i) => i !== index))} className="w-full rounded-xl border border-border px-3 py-3 text-sm text-muted transition hover:border-danger hover:text-danger sm:w-auto" aria-label={`Remove ${item.language || "language"}`}>Remove</button>
                        </div>
                      </div>
                    ))}
                    <button type="button" disabled={languages.length >= 20} onClick={() => setLanguages((current) => [...current, { language: "", proficiency: "conversational" }])} className="rounded-xl border border-border px-4 py-3 text-sm font-medium transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50">+ Add a language</button>
                    <p className="text-xs text-muted">Add up to 20 languages. You can leave this section empty.</p>
                  </div>
                )}
              </section>
            </>
          )}

          {!reviewing && step === 3 && (
            <>
              <section className={cardClass}>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent">06 · Job preferences</p>
                  <h2 className="mt-2 text-xl font-semibold">What kind of work are you looking for?</h2>
                  <p className="mt-1 text-sm text-muted">Tell us what roles interest you and what kind of work arrangement you prefer.</p>
                </div>
                {preferencesLoading ? (
                  <p className="text-sm text-muted">Loading your saved preferences...</p>
                ) : (
                  <div className="space-y-8">
                    <SelectionGroup title="Preferred job roles" description="Select all the roles you would consider." options={roleOptions} selected={preferredRoles} onToggle={(option) => toggleSelection(option, preferredRoles, setPreferredRoles)} />
                    <SelectionGroup title="Preferred departments" description="Which hospitality departments interest you?" options={departmentOptions} selected={preferredDepartments} onToggle={(option) => toggleSelection(option, preferredDepartments, setPreferredDepartments)} />
                    <SelectionGroup title="Employment types" description="Choose all arrangements you would consider." options={workTypeOptions} selected={employmentTypes} onToggle={(option) => toggleSelection(option, employmentTypes, setEmploymentTypes)} />

                    <div className="border-t border-border pt-6">
                      <h3 className="text-sm font-semibold">Salary expectations</h3>
                      <p className="mt-1 text-xs text-muted">Optional. Leave both fields blank if you are flexible. Currency is INR.</p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className={labelClass}>Minimum salary (₹)</span>
                          <input type="number" min="0" max="9999999999.99" step="0.01" value={minimumSalary} onChange={(e) => setMinimumSalary(e.target.value)} placeholder="e.g. 15000" className={fieldClass} />
                        </label>
                        <label className="block">
                          <span className={labelClass}>Maximum salary (₹)</span>
                          <input type="number" min="0" max="9999999999.99" step="0.01" value={maximumSalary} onChange={(e) => setMaximumSalary(e.target.value)} placeholder="e.g. 25000" className={fieldClass} />
                        </label>
                      </div>
                      <label className="mt-4 block">
                        <span className={labelClass}>Salary period</span>
                        <select value={salaryPeriod} onChange={(e) => setSalaryPeriod(e.target.value)} className={fieldClass}>
                          {salaryPeriods.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}
                        </select>
                      </label>
                    </div>

                    <div className="border-t border-border pt-6">
                      <h3 className="text-sm font-semibold">Availability</h3>
                      <p className="mt-1 text-xs text-muted">When would you be able to join a new role?</p>
                      <label className="mt-4 block">
                        <span className={labelClass}>When can you join?</span>
                        <select value={availabilityStatus} onChange={(e) => { setAvailabilityStatus(e.target.value); setAvailableFrom(""); setNoticePeriodDays(""); }} className={fieldClass}>
                          <option value="immediate">Immediately</option>
                          <option value="notice_period">After my notice period</option>
                          <option value="specific_date">From a specific date</option>
                          <option value="flexible">Flexible / Not sure yet</option>
                        </select>
                      </label>
                      {availabilityStatus === "notice_period" && (
                        <label className="mt-4 block">
                          <span className={labelClass}>Notice period (days)</span>
                          <input type="number" min="0" max="365" step="1" value={noticePeriodDays} onChange={(e) => setNoticePeriodDays(e.target.value)} placeholder="e.g. 30" className={fieldClass} />
                        </label>
                      )}
                      {availabilityStatus === "specific_date" && (
                        <label className="mt-4 block">
                          <span className={labelClass}>Available from</span>
                          <input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className={fieldClass} />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {reviewing && (
            <section className={cardClass}>
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">Final check</p>
                <h2 className="mt-2 text-xl font-semibold">Your candidate profile</h2>
                <p className="mt-1 text-sm text-muted">Make sure everything looks right before you submit.</p>
              </div>
              <div className="space-y-1">
                <div>
                  <h3 className="mb-1 text-sm font-semibold">About you</h3>
                  <dl>
                    <ReviewRow label="Current city">{city.trim()}</ReviewRow>
                    <ReviewRow label="Preferred cities">{parseList(preferredCities).join(", ")}</ReviewRow>
                    <ReviewRow label="Experience">{experience} years</ReviewRow>
                    <ReviewRow label="Employment status">{employmentStatus}</ReviewRow>
                    <ReviewRow label="Current / last role">{currentPosition.trim()}</ReviewRow>
                    <ReviewRow label="Introduction">{bio.trim()}</ReviewRow>
                  </dl>
                </div>
                <div className="pt-4">
                  <h3 className="mb-1 text-sm font-semibold">Skills & languages</h3>
                  <dl>
                    <ReviewRow label="Skills">{parseList(skills).join(", ")}</ReviewRow>
                    <ReviewRow label="Languages">{languages.map((item) => `${item.language.trim()} (${languageProficiencies.find((level) => level.value === item.proficiency)?.label ?? item.proficiency})`).join(", ")}</ReviewRow>
                  </dl>
                </div>
                <div className="pt-4">
                  <h3 className="mb-1 text-sm font-semibold">Job preferences</h3>
                  <dl>
                    <ReviewRow label="Roles">{preferredRoles.join(", ")}</ReviewRow>
                    <ReviewRow label="Departments">{preferredDepartments.join(", ")}</ReviewRow>
                    <ReviewRow label="Employment types">{employmentTypes.join(", ")}</ReviewRow>
                    <ReviewRow label="Salary">
                      {minimumSalary || maximumSalary
                        ? `₹${minimumSalary || "—"} – ₹${maximumSalary || "—"} ${salaryPeriods.find((period) => period.value === salaryPeriod)?.label.toLowerCase() ?? ""}`
                        : "Flexible"}
                    </ReviewRow>
                    <ReviewRow label="Availability">
                      {availabilityStatus === "immediate" ? "Immediately" : availabilityStatus === "notice_period" ? `${noticePeriodDays} days notice` : availabilityStatus === "specific_date" ? `From ${availableFrom}` : "Flexible / Not sure yet"}
                    </ReviewRow>
                  </dl>
                </div>
              </div>
            </section>
          )}

          {errorMessage && (
            <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              {errorMessage}
            </div>
          )}

          {!reviewing && (
            <div className="rounded-2xl bg-surface-muted p-5">
              <p className="text-sm font-medium">Your information stays protected</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Your information will be used to help Apronly match you with suitable hospitality opportunities. Your contact details won’t be publicly displayed on job listings.
              </p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              disabled={submitting || (step === 1 && !reviewing)}
              onClick={() => {
                setErrorMessage("");
                if (reviewing) setReviewing(false);
                else setStep((current) => (current === 3 ? 2 : 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="rounded-xl border border-border px-6 py-4 text-sm font-semibold transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {reviewing ? "Back to preferences" : "Back"}
            </button>

            {!reviewing ? (
              <button
                type="button"
                disabled={loading || submitting}
                onClick={handleContinue}
                className="w-full rounded-xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-48"
              >
                {loading ? "Loading saved information..." : step === 3 ? "Review your profile" : "Continue"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={submitting || loading}
                className="w-full rounded-xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-48"
              >
                {submitting ? "Saving your profile..." : "Complete my profile"}
              </button>
            )}
          </div>

          <p className="pb-6 text-center text-xs text-muted">
            You can update your profile later.
          </p>
        </div>
      </div>
    </main>
  );
}
  