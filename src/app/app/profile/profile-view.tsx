"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  city: string | null;
  preferred_cities: string[] | null;
  skills: string[] | null;
  experience_years: number | null;
  current_position: string | null;
  employment_status: string | null;
  bio: string | null;
};

type Preferences = {
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

type Language = {
  language: string;
  proficiency: string;
};

type Employment = {
  employer_name: string;
  job_title: string;
  department: string;
  employment_type: string;
  city: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  responsibilities: string;
};

type Resume = {
  storage_path: string;
  original_file_name: string;
  mime_type: string;
  file_size_bytes: number;
};

const MAX_RESUME_BYTES = 1_000_000;
const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

const roles = [
  "Chef",
  "Commis Chef",
  "Sous Chef",
  "Head Chef",
  "Kitchen Helper",
  "Restaurant Manager",
  "Assistant Restaurant Manager",
  "Waiter / Server",
  "Captain / Supervisor",
  "Host / Hostess",
  "Bartender",
  "Barista",
  "Cashier",
  "Steward",
  "Housekeeping Associate",
  "Front Desk Associate",
  "Hotel Operations",
];

const departments = [
  "Kitchen",
  "Food & Beverage Service",
  "Bar",
  "Front Office",
  "Housekeeping",
  "Stewarding",
  "Restaurant Operations",
  "Hotel Operations",
  "Administration",
];

const employmentTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Temporary",
  "Apprenticeship",
];

const employmentStatuses = [
  "Currently employed",
  "Open to opportunities",
  "Not currently employed",
  "Student",
  "Freelancer",
];

const proficiencies = [
  ["basic", "Basic"],
  ["conversational", "Conversational"],
  ["professional", "Professional"],
  ["fluent", "Fluent"],
  ["native", "Native"],
] as const;

const periods = [
  ["hourly", "Per hour"],
  ["daily", "Per day"],
  ["weekly", "Per week"],
  ["monthly", "Per month"],
  ["yearly", "Per year"],
] as const;

const inputClass =
  "mt-2 w-full rounded-xl border border-[#e5e1d8] bg-[#fbfaf6] px-3.5 py-3 text-sm text-[#243329] outline-none transition placeholder:text-[#9a9c91] focus:border-[#789477]";

const labelClass = "block text-sm font-medium text-[#38483b]";

const cardClass =
  "rounded-2xl border border-[#e9e4da] bg-white p-5 shadow-[0_2px_10px_rgba(38,50,35,0.025)] sm:p-7";

function splitList(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((v) => v.trim().replace(/\s+/g, " "))
        .filter(Boolean),
    ),
  ];
}

function ToggleGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-[#38483b]">
        {label}
      </legend>

      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);

          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange(
                  active
                    ? selected.filter((v) => v !== option)
                    : [...selected, option],
                )
              }
              className={`rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                active
                  ? "border-[#8ca486] bg-[#edf2e8] text-[#285438]"
                  : "border-[#e7e4dc] bg-white text-[#69736a] hover:border-[#9eaf98]"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function CandidateProfileView({
  initialProfile,
  initialPreferences,
  initialLanguages,
  initialEmployment,
  initialResume,
  fullName,
}: {
  initialProfile: Profile;
  initialPreferences: Preferences | null;
  initialLanguages: Language[];
  initialEmployment: Employment[];
  initialResume: Resume | null;
  fullName: string;
}) {
  const [city, setCity] = useState(initialProfile.city ?? "");
  const [preferredCities, setPreferredCities] = useState(
    (initialProfile.preferred_cities ?? []).join(", "),
  );
  const [skills, setSkills] = useState(
    (initialProfile.skills ?? []).join(", "),
  );
  const [experience, setExperience] = useState(
    String(initialProfile.experience_years ?? 0),
  );
  const [position, setPosition] = useState(
    initialProfile.current_position ?? "",
  );
  const [employmentStatus, setEmploymentStatus] = useState(
    initialProfile.employment_status ?? "",
  );
  const [bio, setBio] = useState(initialProfile.bio ?? "");

  const [preferredRoles, setPreferredRoles] = useState(
    initialPreferences?.preferred_roles ?? [],
  );
  const [preferredDepartments, setPreferredDepartments] = useState(
    initialPreferences?.preferred_departments ?? [],
  );
  const [workTypes, setWorkTypes] = useState(
    initialPreferences?.employment_types ?? [],
  );

  const [minimumSalary, setMinimumSalary] = useState(
    initialPreferences?.minimum_salary == null
      ? ""
      : String(initialPreferences.minimum_salary),
  );

  const [maximumSalary, setMaximumSalary] = useState(
    initialPreferences?.maximum_salary == null
      ? ""
      : String(initialPreferences.maximum_salary),
  );

  const [salaryPeriod, setSalaryPeriod] = useState(
    initialPreferences?.salary_period ?? "monthly",
  );

  const [availability, setAvailability] = useState(
    initialPreferences?.availability_status ?? "flexible",
  );

  const [availableFrom, setAvailableFrom] = useState(
    initialPreferences?.available_from ?? "",
  );

  const [noticeDays, setNoticeDays] = useState(
    initialPreferences?.notice_period_days == null
      ? ""
      : String(initialPreferences.notice_period_days),
  );

  const [languages, setLanguages] =
    useState<Language[]>(initialLanguages);

  const [employment, setEmployment] =
    useState<Employment[]>(initialEmployment);

  const [resume, setResume] = useState<Resume | null>(initialResume);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const completion = useMemo(() => {
    const checks = [
      city.trim().length >= 2,
      preferredCities.trim().length > 0,
      skills.trim().length > 0,
      Number(experience) >= 0,
      position.trim().length > 0,
      bio.trim().length > 0,
      preferredRoles.length > 0,
      workTypes.length > 0,
      languages.length > 0,
      employment.length > 0,
    ];

    return Math.round(
      (checks.filter(Boolean).length / checks.length) * 100,
    );
  }, [
    city,
    preferredCities,
    skills,
    experience,
    position,
    bio,
    preferredRoles,
    workTypes,
    languages,
    employment,
  ]);

  async function openResume() {
    if (!resume) return;

    setResumeError("");
    const supabase = createClient();

    const { data, error: signedUrlError } = await supabase.storage
      .from("candidate-documents")
      .createSignedUrl(resume.storage_path, 60);

    if (signedUrlError || !data?.signedUrl) {
      setResumeError(
        signedUrlError?.message ?? "Could not open your resume.",
      );
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function uploadResume(file: File | undefined) {
    setResumeError("");
    setMessage("");
    if (!file) return;

    if (!ALLOWED_RESUME_TYPES.includes(file.type)) {
      setResumeError("Upload a PDF, DOC, DOCX, JPG or PNG file.");
      return;
    }

    if (file.size < 1 || file.size > MAX_RESUME_BYTES) {
      setResumeError("The file must be smaller than 1 MB (maximum 1,000,000 bytes).");
      return;
    }

    setResumeUploading(true);
    const supabase = createClient();
    let uploadedPath: string | null = null;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please sign in again before uploading your resume.");
      }

      const safeName =
        file.name
          .normalize("NFKD")
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(-100) || "resume";
      const newPath = `${user.id}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("candidate-documents")
        .upload(newPath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;
      uploadedPath = newPath;

      const newResume: Resume = {
        storage_path: newPath,
        original_file_name: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
      };

      if (resume) {
        // Replace the existing candidate resume metadata row; do not create
        // another active resume record.
        const { data: updatedDocument, error: updateError } = await supabase
          .from("candidate_documents")
          .update({
            storage_path: newResume.storage_path,
            original_file_name: newResume.original_file_name,
            mime_type: newResume.mime_type,
            file_size_bytes: newResume.file_size_bytes,
            verification_status: "unverified",
          })
          .eq("candidate_id", user.id)
          .eq("document_type", "resume")
          .eq("storage_path", resume.storage_path)
          .select("storage_path")
          .maybeSingle();

        if (updateError) throw updateError;
        if (!updatedDocument) {
          throw new Error(
            "Your existing resume record could not be updated. The previous resume has been kept.",
          );
        }

        // The database now points to the new object. Remove the old private
        // object afterwards; a cleanup failure must not undo the replacement.
        const { error: cleanupError } = await supabase.storage
          .from("candidate-documents")
          .remove([resume.storage_path]);

        setResume(newResume);
        setMessage(
          cleanupError
            ? "Your resume was replaced. The previous stored file could not be cleaned up automatically."
            : "Your resume has been replaced successfully.",
        );
      } else {
        const { error: insertError } = await supabase
          .from("candidate_documents")
          .insert({
            candidate_id: user.id,
            document_type: "resume",
            storage_path: newResume.storage_path,
            original_file_name: newResume.original_file_name,
            mime_type: newResume.mime_type,
            file_size_bytes: newResume.file_size_bytes,
            verification_status: "unverified",
          });

        if (insertError) throw insertError;
        setResume(newResume);
        setMessage("Your resume has been uploaded successfully.");
      }
    } catch (uploadError) {
      console.error("Candidate resume upload error:", uploadError);

      // If metadata could not be saved, remove the newly uploaded orphan.
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage
          .from("candidate-documents")
          .remove([uploadedPath]);
        if (cleanupError) {
          console.error("Could not clean up failed resume upload:", cleanupError);
        }
      }

      setResumeError(
        uploadError instanceof Error
          ? uploadError.message
          : "Resume upload failed. Please try again.",
      );
    } finally {
      setResumeUploading(false);
    }
  }

  function updateEmployment(
    index: number,
    patch: Partial<Employment>,
  ) {
    setEmployment((current) =>
      current.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    );
  }

  async function saveProfile() {
    setError("");
    setMessage("");

    const cleanCity = city.trim().replace(/\s+/g, " ");
    const exp = Number(experience);

    const min = minimumSalary.trim()
      ? Number(minimumSalary)
      : null;

    const max = maximumSalary.trim()
      ? Number(maximumSalary)
      : null;

    const notice = noticeDays.trim()
      ? Number(noticeDays)
      : null;

    if (cleanCity.length < 2 || cleanCity.length > 100) {
      setError("Enter a valid current city.");
      return;
    }

    if (
      !Number.isFinite(exp) ||
      exp < 0 ||
      exp > 80
    ) {
      setError("Experience must be between 0 and 80 years.");
      return;
    }

    if (position.trim().length > 150) {
      setError(
        "Your current position must be 150 characters or fewer.",
      );
      return;
    }

    if (bio.trim().length > 1000) {
      setError(
        "Your introduction must be 1,000 characters or fewer.",
      );
      return;
    }

    if (
      splitList(preferredCities).length > 20 ||
      splitList(skills).length > 50
    ) {
      setError(
        "Please check the number of preferred cities or skills.",
      );
      return;
    }

    if (
      (min !== null &&
        (!Number.isFinite(min) ||
          min < 0 ||
          min > 9999999999.99)) ||
      (max !== null &&
        (!Number.isFinite(max) ||
          max < 0 ||
          max > 9999999999.99))
    ) {
      setError("Enter valid salary amounts.");
      return;
    }

    if (min !== null && max !== null && min > max) {
      setError("Minimum salary cannot exceed maximum salary.");
      return;
    }

    if (
      availability === "notice_period" &&
      (notice === null ||
        !Number.isInteger(notice) ||
        notice < 0 ||
        notice > 365)
    ) {
      setError("Enter a notice period between 0 and 365 days.");
      return;
    }

    if (
      availability === "specific_date" &&
      !availableFrom
    ) {
      setError("Choose your available-from date.");
      return;
    }

    if (
      languages.length > 20 ||
      employment.length > 20
    ) {
      setError(
        "You can add up to 20 languages and 20 work history entries.",
      );
      return;
    }

    const cleanLanguages = languages.map((item) => ({
      language: item.language.trim().replace(/\s+/g, " "),
      proficiency: item.proficiency.trim().toLowerCase(),
    }));

    if (
      cleanLanguages.some(
        (item) =>
          item.language.length < 2 ||
          item.language.length > 60 ||
          !proficiencies.some(
            ([value]) => value === item.proficiency,
          ),
      )
    ) {
      setError("Check each language and proficiency level.");
      return;
    }

    if (
      new Set(
        cleanLanguages.map((v) => v.language.toLowerCase()),
      ).size !== cleanLanguages.length
    ) {
      setError("Remove duplicate languages.");
      return;
    }

    for (const [i, item] of employment.entries()) {
      const employer = item.employer_name.trim();
      const title = item.job_title.trim();

      if (
        employer.length < 2 ||
        employer.length > 150 ||
        title.length < 2 ||
        title.length > 150
      ) {
        setError(
          `Work entry ${i + 1}: employer and job title must be 2–150 characters.`,
        );
        return;
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(item.start_date) ||
        Number.isNaN(
          Date.parse(`${item.start_date}T00:00:00Z`),
        )
      ) {
        setError(
          `Work entry ${i + 1}: enter a valid start date.`,
        );
        return;
      }

      if (item.is_current && item.end_date) {
        setError(
          `Work entry ${i + 1}: clear the end date for a current role.`,
        );
        return;
      }

      if (
        !item.is_current &&
        item.end_date &&
        (item.end_date < item.start_date ||
          Number.isNaN(
            Date.parse(`${item.end_date}T00:00:00Z`),
          ))
      ) {
        setError(
          `Work entry ${i + 1}: enter a valid end date.`,
        );
        return;
      }

      if (item.responsibilities.length > 2000) {
        setError(
          `Work entry ${i + 1}: responsibilities must be under 2,000 characters.`,
        );
        return;
      }
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please sign in again.");
      }

      const { error: saveError } = await supabase.rpc(
        "complete_candidate_onboarding_with_preferences",
        {
          p_city: cleanCity,
          p_preferred_cities: splitList(preferredCities),
          p_skills: splitList(skills),
          p_experience_years: exp,
          p_current_position: position.trim() || null,
          p_employment_status: employmentStatus || null,
          p_bio: bio.trim() || null,
          p_preferred_roles: preferredRoles,
          p_preferred_departments: preferredDepartments,
          p_employment_types: workTypes,
          p_minimum_salary: min,
          p_maximum_salary: max,
          p_salary_currency: "INR",
          p_salary_period:
            min !== null || max !== null
              ? salaryPeriod
              : null,
          p_availability_status: availability,
          p_available_from:
            availability === "specific_date"
              ? availableFrom
              : null,
          p_notice_period_days:
            availability === "notice_period"
              ? notice
              : null,
          p_languages: cleanLanguages,
          p_employment_history: employment.map((item) => ({
            employer_name: item.employer_name
              .trim()
              .replace(/\s+/g, " "),
            job_title: item.job_title
              .trim()
              .replace(/\s+/g, " "),
            department: item.department.trim() || null,
            employment_type:
              item.employment_type.trim() || null,
            city: item.city.trim() || null,
            start_date: item.start_date,
            end_date:
              item.is_current || !item.end_date
                ? null
                : item.end_date,
            is_current: item.is_current,
            responsibilities:
              item.responsibilities.trim() || null,
          })),
        },
      );

      if (saveError) throw saveError;

      setMessage("Your profile has been saved.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fbf9f3] px-4 pb-12 text-[#1b2b20] sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1240px]">
        <header className="border-b border-[#e9e3d8] py-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#39704d]">
            Candidate workspace · My profile
          </p>

          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-[#17251c] sm:text-4xl">
                Your professional profile
              </h1>

              <p className="mt-2 text-sm text-[#6e786d]">
                Keep your experience and preferences up to date,{" "}
                {fullName.split(" ")[0]}.
              </p>
            </div>

            <div className="w-full rounded-xl border border-[#e7e3d9] bg-white px-4 py-3 sm:w-64">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#526153]">
                  Profile completeness
                </span>
                <strong className="text-[#245a38]">
                  {completion}%
                </strong>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0e8]">
                <div
                  className="h-full rounded-full bg-[#6f956d] transition-all"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="mt-7 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-[#e9e4da] bg-white p-4 lg:sticky lg:top-6">
            <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#899287]">
              Profile sections
            </p>

            <nav className="flex gap-2 overflow-x-auto lg:flex-col">
              {[
                ["#about", "About you"],
                ["#skills", "Skills & languages"],
                ["#experience", "Work history"],
                ["#preferences", "Job preferences"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="shrink-0 rounded-lg px-3 py-2.5 text-xs font-semibold text-[#536153] transition hover:bg-[#edf2e8] hover:text-[#245a38]"
                >
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 space-y-6">
            {/* ABOUT YOU */}
            <section id="about" className={cardClass}>
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#b17c48]">
                  01 · Personal details
                </p>
                <h2 className="mt-1 font-serif text-2xl font-bold">
                  About you
                </h2>
                <p className="mt-1 text-xs text-[#7b8579]">
                  Your location, current role and professional introduction.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className={labelClass}>
                  Current city
                  <input
                    className={inputClass}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={100}
                    placeholder="e.g. Hyderabad"
                  />
                </label>

                <label className={labelClass}>
                  Preferred work cities
                  <input
                    className={inputClass}
                    value={preferredCities}
                    onChange={(e) => setPreferredCities(e.target.value)}
                    placeholder="Hyderabad, Mumbai, Pune"
                  />
                  <span className="mt-1 block text-[11px] font-normal text-[#899187]">
                    Separate cities with commas.
                  </span>
                </label>

                <label className={labelClass}>
                  Total experience (years)
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    max="80"
                    step="0.5"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                  />
                </label>

                <label className={labelClass}>
                  Employment status
                  <select
                    className={inputClass}
                    value={employmentStatus}
                    onChange={(e) => setEmploymentStatus(e.target.value)}
                  >
                    <option value="">Select status</option>
                    {employmentStatuses.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>

                <label className={`${labelClass} sm:col-span-2`}>
                  Current or last job position
                  <input
                    className={inputClass}
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    maxLength={150}
                    placeholder="e.g. Head Chef, Restaurant Manager, Waiter"
                  />
                </label>

                <label className={`${labelClass} sm:col-span-2`}>
                  Professional introduction
                  <textarea
                    className={`${inputClass} min-h-32 resize-y leading-6`}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={1000}
                    placeholder="Share your hospitality experience, strengths and the work you're interested in..."
                  />
                  <span className="mt-1 block text-right text-[11px] font-normal text-[#899187]">
                    {bio.length}/1000
                  </span>
                </label>
              </div>
            </section>

            {/* SKILLS AND LANGUAGES */}
            <section id="skills" className={cardClass}>
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#b17c48]">
                02 · Capabilities
              </p>

              <h2 className="mt-1 font-serif text-2xl font-bold">
                Skills & languages
              </h2>

              <label className={`${labelClass} mt-5`}>
                Skills
                <textarea
                  className={`${inputClass} min-h-24 resize-y`}
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="Food preparation, customer service, inventory management..."
                />
                <span className="mt-1 block text-[11px] font-normal text-[#899187]">
                  Separate skills with commas.
                </span>
              </label>

              <div className="mt-7 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Languages</h3>
                  <p className="mt-1 text-xs text-[#899187]">
                    Add the languages you can use at work.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={languages.length >= 20}
                  onClick={() =>
                    setLanguages((v) => [
                      ...v,
                      {
                        language: "",
                        proficiency: "conversational",
                      },
                    ])
                  }
                  className="rounded-lg border border-[#dce4d7] px-3 py-2 text-xs font-semibold text-[#356144] hover:bg-[#f2f5ee] disabled:opacity-40"
                >
                  + Add language
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {languages.map((item, i) => (
                  <div
                    key={i}
                    className="grid gap-3 rounded-xl border border-[#eeeae2] bg-[#fdfcf9] p-3 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <input
                      aria-label="Language"
                      className={inputClass.replace("mt-2 ", "")}
                      value={item.language}
                      onChange={(e) =>
                        setLanguages((v) =>
                          v.map((x, n) =>
                            n === i
                              ? { ...x, language: e.target.value }
                              : x,
                          ),
                        )
                      }
                      placeholder="e.g. English"
                    />

                    <select
                      aria-label="Proficiency"
                      className={inputClass.replace("mt-2 ", "")}
                      value={item.proficiency}
                      onChange={(e) =>
                        setLanguages((v) =>
                          v.map((x, n) =>
                            n === i
                              ? { ...x, proficiency: e.target.value }
                              : x,
                          ),
                        )
                      }
                    >
                      {proficiencies.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        setLanguages((v) =>
                          v.filter((_, n) => n !== i),
                        )
                      }
                      className="px-3 text-xs font-semibold text-[#9b6255] hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {!languages.length && (
                  <p className="rounded-xl bg-[#f8f7f2] p-4 text-xs text-[#858d82]">
                    No languages added yet.
                  </p>
                )}
              </div>
            </section>

            {/* WORK EXPERIENCE */}
            <section id="experience" className={cardClass}>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#b17c48]">
                    03 · Career history
                  </p>
                  <h2 className="mt-1 font-serif text-2xl font-bold">
                    Work experience
                  </h2>
                  <p className="mt-1 text-xs text-[#899187]">
                    Your previous and current hospitality roles.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={employment.length >= 20}
                  onClick={() =>
                    setEmployment((v) => [
                      ...v,
                      {
                        employer_name: "",
                        job_title: "",
                        department: "",
                        employment_type: "",
                        city: "",
                        start_date: "",
                        end_date: "",
                        is_current: false,
                        responsibilities: "",
                      },
                    ])
                  }
                  className="rounded-lg border border-[#dce4d7] px-3 py-2 text-xs font-semibold text-[#356144] hover:bg-[#f2f5ee] disabled:opacity-40"
                >
                  + Add experience
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {employment.map((item, i) => (
                  <article
                    key={i}
                    className="rounded-xl border border-[#eeeae2] bg-[#fdfcf9] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        Experience {i + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setEmployment((v) =>
                            v.filter((_, n) => n !== i),
                          )
                        }
                        className="text-xs font-semibold text-[#9b6255]"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className={labelClass}>
                        Employer / business
                        <input
                          className={inputClass}
                          value={item.employer_name}
                          onChange={(e) =>
                            updateEmployment(i, {
                              employer_name: e.target.value,
                            })
                          }
                          maxLength={150}
                        />
                      </label>

                      <label className={labelClass}>
                        Job title
                        <input
                          className={inputClass}
                          value={item.job_title}
                          onChange={(e) =>
                            updateEmployment(i, {
                              job_title: e.target.value,
                            })
                          }
                          maxLength={150}
                        />
                      </label>

                      <label className={labelClass}>
                        Department
                        <select
                          className={inputClass}
                          value={item.department}
                          onChange={(e) =>
                            updateEmployment(i, {
                              department: e.target.value,
                            })
                          }
                        >
                          <option value="">Select department</option>
                          {departments.map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                          <option>Other</option>
                        </select>
                      </label>

                      <label className={labelClass}>
                        Employment type
                        <select
                          className={inputClass}
                          value={item.employment_type}
                          onChange={(e) =>
                            updateEmployment(i, {
                              employment_type: e.target.value,
                            })
                          }
                        >
                          <option value="">Select type</option>
                          {employmentTypes.map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </label>

                      <label className={labelClass}>
                        City
                        <input
                          className={inputClass}
                          value={item.city}
                          onChange={(e) =>
                            updateEmployment(i, {
                              city: e.target.value,
                            })
                          }
                          maxLength={100}
                        />
                      </label>

                      <label className={labelClass}>
                        Start date
                        <input
                          type="date"
                          className={inputClass}
                          value={item.start_date}
                          onChange={(e) =>
                            updateEmployment(i, {
                              start_date: e.target.value,
                            })
                          }
                        />
                      </label>

                      <label className={labelClass}>
                        End date
                        <input
                          type="date"
                          className={inputClass}
                          value={item.end_date ?? ""}
                          disabled={item.is_current}
                          onChange={(e) =>
                            updateEmployment(i, {
                              end_date: e.target.value,
                            })
                          }
                        />
                      </label>
                    </div>

                    <label className="mt-4 flex items-center gap-2 text-xs text-[#526153]">
                      <input
                        type="checkbox"
                        checked={item.is_current}
                        onChange={(e) =>
                          updateEmployment(i, {
                            is_current: e.target.checked,
                            end_date: e.target.checked
                              ? ""
                              : item.end_date,
                          })
                        }
                      />
                      I currently work here
                    </label>

                    <label className={`${labelClass} mt-4`}>
                      Responsibilities / achievements
                      <textarea
                        className={`${inputClass} min-h-20 resize-y`}
                        value={item.responsibilities}
                        onChange={(e) =>
                          updateEmployment(i, {
                            responsibilities: e.target.value,
                          })
                        }
                        maxLength={2000}
                      />
                    </label>
                  </article>
                ))}

                {!employment.length && (
                  <p className="rounded-xl bg-[#f8f7f2] p-4 text-xs text-[#858d82]">
                    No work experience added yet. You can add it whenever
                    you&apos;re ready.
                  </p>
                )}
              </div>
            </section>

            {/* JOB PREFERENCES */}
            <section id="preferences" className={cardClass}>
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#b17c48]">
                04 · Next step
              </p>

              <h2 className="mt-1 font-serif text-2xl font-bold">
                Job preferences
              </h2>

              <p className="mt-1 text-xs text-[#899187]">
                Help Apronly match you with roles that fit your goals.
              </p>

              <div className="mt-6 space-y-7">
                <ToggleGroup
                  label="Preferred job roles"
                  options={roles}
                  selected={preferredRoles}
                  onChange={setPreferredRoles}
                />

                <ToggleGroup
                  label="Preferred departments"
                  options={departments}
                  selected={preferredDepartments}
                  onChange={setPreferredDepartments}
                />

                <ToggleGroup
                  label="Employment types"
                  options={employmentTypes}
                  selected={workTypes}
                  onChange={setWorkTypes}
                />

                <div className="border-t border-[#eeeae2] pt-5">
                  <h3 className="text-sm font-semibold">
                    Salary expectations
                  </h3>

                  <p className="mt-1 text-xs text-[#899187]">
                    Optional · Currency is INR (₹).
                  </p>

                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className={labelClass}>
                      Minimum salary (₹)
                      <input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={minimumSalary}
                        onChange={(e) =>
                          setMinimumSalary(e.target.value)
                        }
                      />
                    </label>

                    <label className={labelClass}>
                      Maximum salary (₹)
                      <input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={maximumSalary}
                        onChange={(e) =>
                          setMaximumSalary(e.target.value)
                        }
                      />
                    </label>
                  </div>

                  <label className={`${labelClass} mt-4`}>
                    Salary period
                    <select
                      className={inputClass}
                      value={salaryPeriod}
                      onChange={(e) =>
                        setSalaryPeriod(e.target.value)
                      }
                    >
                      {periods.map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="border-t border-[#eeeae2] pt-5">
                  <h3 className="text-sm font-semibold">Availability</h3>

                  <label className={`${labelClass} mt-3`}>
                    When can you join?
                    <select
                      className={inputClass}
                      value={availability}
                      onChange={(e) => {
                        setAvailability(e.target.value);
                        setAvailableFrom("");
                        setNoticeDays("");
                      }}
                    >
                      <option value="immediate">Immediately</option>
                      <option value="notice_period">
                        After my notice period
                      </option>
                      <option value="specific_date">
                        From a specific date
                      </option>
                      <option value="flexible">
                        Flexible / Not sure yet
                      </option>
                    </select>
                  </label>

                  {availability === "notice_period" && (
                    <label className={`${labelClass} mt-4`}>
                      Notice period (days)
                      <input
                        type="number"
                        min="0"
                        max="365"
                        className={inputClass}
                        value={noticeDays}
                        onChange={(e) =>
                          setNoticeDays(e.target.value)
                        }
                      />
                    </label>
                  )}

                  {availability === "specific_date" && (
                    <label className={`${labelClass} mt-4`}>
                      Available from
                      <input
                        type="date"
                        className={inputClass}
                        value={availableFrom}
                        onChange={(e) =>
                          setAvailableFrom(e.target.value)
                        }
                      />
                    </label>
                  )}
                </div>
              </div>
            </section>

            {/* RESUME */}
            <section className={cardClass}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Resume</p>
                  <p className="mt-1 break-all text-xs text-[#899187]">
                    {resume
                      ? `${resume.original_file_name} · ${(resume.file_size_bytes / 1024).toFixed(0)} KB`
                      : "No resume uploaded yet."}
                  </p>
                  <p className="mt-2 text-[11px] text-[#899187]">
                    Your resume is stored privately and is only opened through a secure, short-lived link.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {resume && (
                    <button
                      type="button"
                      onClick={openResume}
                      disabled={resumeUploading}
                      className="rounded-lg border border-[#dce4d7] px-4 py-2.5 text-xs font-semibold text-[#356144] hover:bg-[#f2f5ee] disabled:opacity-50"
                    >
                      View resume
                    </button>
                  )}

                  <label className={`cursor-pointer rounded-lg bg-[#174f32] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#103f27] ${resumeUploading ? "pointer-events-none opacity-60" : ""}`}>
                    {resumeUploading
                      ? "Uploading..."
                      : resume
                        ? "Replace resume"
                        : "Upload resume"}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                      className="sr-only"
                      disabled={resumeUploading}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        void uploadResume(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-[#899187]">
                Accepted formats: PDF, DOC, DOCX, JPG and PNG. Maximum file size: 1 MB.
              </p>

              {resumeError && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-[#e7c9bf] bg-[#fff5f1] px-3 py-2 text-xs text-[#9b4e3c]"
                >
                  {resumeError}
                </p>
              )}
            </section>

            {/* SAVE FEEDBACK */}
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-[#e7c9bf] bg-[#fff5f1] px-4 py-3 text-sm text-[#9b4e3c]"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="rounded-xl border border-[#dce7d7] bg-[#edf3e9] px-4 py-3 text-sm text-[#315b3d]"
              >
                {message}
              </p>
            )}

            <div className="sticky bottom-3 flex flex-col-reverse items-stretch justify-between gap-3 rounded-2xl border border-[#e8e4da] bg-[#fbf9f3]/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center">
              <p className="px-2 text-xs text-[#7b8579]">
                Only your profile information is updated. Your invitations
                are not changed.
              </p>

              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="rounded-xl bg-[#174f32] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#103f27] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving changes..." : "Save profile changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}