
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type HiringRequest = {
  id: string;
  restaurant_id: string;
  title: string;
  department: string;
  openings: number;
  description: string;
  responsibilities: string | null;
  minimum_experience_years: number | null;
  maximum_experience_years: number | null;
  required_skills: string[];
  employment_type: string;
  shift_type: string;
  minimum_salary: number | null;
  maximum_salary: number | null;
  salary_currency: string;
  salary_period: string | null;
  city: string;
  joining_timeline: string;
  status: string;
  created_at: string;
};

type Props = {
  restaurantId: string;
};

type FormState = {
  title: string;
  department: string;
  openings: string;
  description: string;
  responsibilities: string;
  minimumExperience: string;
  maximumExperience: string;
  skills: string;
  employmentType: string;
  shiftType: string;
  minimumSalary: string;
  maximumSalary: string;
  salaryPeriod: string;
  city: string;
  joiningTimeline: string;
};

const emptyForm: FormState = {
  title: "",
  department: "",
  openings: "1",
  description: "",
  responsibilities: "",
  minimumExperience: "",
  maximumExperience: "",
  skills: "",
  employmentType: "full_time",
  shiftType: "rotational",
  minimumSalary: "",
  maximumSalary: "",
  salaryPeriod: "monthly",
  city: "",
  joiningTimeline: "immediate",
};

const inputClass =
  "w-full rounded-xl border border-[#DCDCCF] bg-[#FCFBF7] px-4 py-4 text-lg font-semibold text-[#26382B] outline-none transition placeholder:font-medium placeholder:text-[#858779] focus:border-[#71845A] focus:ring-4 focus:ring-[#71845A]/15 disabled:cursor-not-allowed disabled:opacity-60";

const labelClass =
  "mb-2.5 block text-base font-bold tracking-[0.015em] text-[#26382B]";

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </span>

      <input
        className={inputClass}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>

      <select
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function statusStyle(status: string) {
  if (status === "approved") {
    return "border border-[#D6E4CC] bg-[#EAF1E4] text-[#315B38]";
  }

  if (status === "rejected") {
    return "border border-[#E9C9C3] bg-[#F8EAE7] text-[#963F34]";
  }

  if (status === "changes_requested") {
    return "border border-[#E9D9BD] bg-[#F7EEDC] text-[#805A28]";
  }

  if (status === "pending_review") {
    return "border border-[#D7E0EC] bg-[#EDF2F8] text-[#435B78]";
  }

  if (status === "draft") {
    return "border border-[#E5E1D6] bg-[#F1F0E9] text-[#53584D]";
  }

  return "border border-[#E5E1D6] bg-[#F1F0E9] text-[#53584D]";
}

export default function HiringManagement({ restaurantId }: Props) {
  const router = useRouter();

  const [requests, setRequests] = useState<HiringRequest[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEditingPendingReview = requests.some(
    (request) =>
      request.id === editingId &&
      request.status === "pending_review",
  );

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function refreshRequests() {
    try {
      const supabase = createClient();

      const { data, error: queryError } = await supabase
        .from("restaurant_hiring_requests")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      setRequests((data ?? []) as HiringRequest[]);
    } catch (err) {
      console.error("Hiring requests lookup failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load hiring requests.",
      );
    }
  }

  useEffect(() => {
    let active = true;

    async function fetchInitialRequests() {
      try {
        const supabase = createClient();

        const { data, error: queryError } = await supabase
          .from("restaurant_hiring_requests")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: false });

        if (queryError) throw queryError;

        if (active) {
          setRequests((data ?? []) as HiringRequest[]);
        }
      } catch (err) {
        console.error("Hiring requests lookup failed:", err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load hiring requests.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchInitialRequests();

    return () => {
      active = false;
    };
  }, [restaurantId]);

  function startNewRequest() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function startEdit(request: HiringRequest) {
    if (
      !["draft", "changes_requested", "pending_review"].includes(
        request.status,
      )
    ) {
      return;
    }

    setForm({
      title: request.title,
      department: request.department,
      openings: String(request.openings),
      description: request.description,
      responsibilities: request.responsibilities ?? "",
      minimumExperience:
        request.minimum_experience_years?.toString() ?? "",
      maximumExperience:
        request.maximum_experience_years?.toString() ?? "",
      skills: (request.required_skills ?? []).join(", "),
      employmentType: request.employment_type,
      shiftType: request.shift_type,
      minimumSalary: request.minimum_salary?.toString() ?? "",
      maximumSalary: request.maximum_salary?.toString() ?? "",
      salaryPeriod: request.salary_period ?? "monthly",
      city: request.city,
      joiningTimeline: request.joining_timeline,
    });

    setEditingId(request.id);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  async function saveRequest(submit: boolean) {
    const isPendingReviewEdit = requests.some(
      (request) =>
        request.id === editingId &&
        request.status === "pending_review",
    );

    setError("");
    setSuccess("");

    if (submitting) return;

    const clean = {
      title: form.title.trim(),
      department: form.department.trim(),
      openings: Number(form.openings),
      description: form.description.trim(),
      responsibilities: form.responsibilities.trim(),
      minimumExperience: form.minimumExperience.trim(),
      maximumExperience: form.maximumExperience.trim(),
      skills: form.skills
        .split(/[,\n]/)
        .map((skill) => skill.trim())
        .filter(Boolean),
      minimumSalary: form.minimumSalary.trim(),
      maximumSalary: form.maximumSalary.trim(),
      city: form.city.trim(),
    };

    if (
      clean.title.length < 2 ||
      clean.department.length < 2 ||
      clean.city.length < 2
    ) {
      setError("Enter a valid role title, department and city.");
      return;
    }

    if (
      !Number.isInteger(clean.openings) ||
      clean.openings < 1 ||
      clean.openings > 500
    ) {
      setError("Openings must be between 1 and 500.");
      return;
    }

    if (clean.description.length < 20) {
      setError("The job description must contain at least 20 characters.");
      return;
    }

    if (clean.skills.length > 30) {
      setError("You can add a maximum of 30 skills.");
      return;
    }

    const minExperience =
      clean.minimumExperience === ""
        ? null
        : Number(clean.minimumExperience);

    const maxExperience =
      clean.maximumExperience === ""
        ? null
        : Number(clean.maximumExperience);

    if (
      (minExperience !== null &&
        (!Number.isFinite(minExperience) || minExperience < 0)) ||
      (maxExperience !== null &&
        (!Number.isFinite(maxExperience) || maxExperience < 0)) ||
      (minExperience !== null &&
        maxExperience !== null &&
        maxExperience < minExperience)
    ) {
      setError("Check the minimum and maximum experience values.");
      return;
    }

    const minSalary =
      clean.minimumSalary === "" ? null : Number(clean.minimumSalary);

    const maxSalary =
      clean.maximumSalary === "" ? null : Number(clean.maximumSalary);

    if (
      (minSalary === null) !== (maxSalary === null) ||
      (minSalary !== null &&
        (!Number.isFinite(minSalary) || minSalary < 0)) ||
      (maxSalary !== null &&
        (!Number.isFinite(maxSalary) || maxSalary < 0)) ||
      (minSalary !== null &&
        maxSalary !== null &&
        maxSalary < minSalary)
    ) {
      setError(
        "Enter both salary limits and ensure the maximum is not lower.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      const { data, error: saveError } = await supabase.rpc(
        "save_restaurant_hiring_request",
        {
          p_request_id: editingId,
          p_restaurant_id: restaurantId,
          p_title: clean.title,
          p_department: clean.department,
          p_openings: clean.openings,
          p_description: clean.description,
          p_responsibilities: clean.responsibilities || null,
          p_minimum_experience_years: minExperience,
          p_maximum_experience_years: maxExperience,
          p_required_skills: clean.skills,
          p_employment_type: form.employmentType,
          p_shift_type: form.shiftType,
          p_minimum_salary: minSalary,
          p_maximum_salary: maxSalary,
          p_salary_currency: "INR",
          p_salary_period: minSalary === null ? null : form.salaryPeriod,
          p_city: clean.city,
          p_joining_timeline: form.joiningTimeline,
          p_submit: isPendingReviewEdit ? true : submit,
        },
      );

      if (saveError) throw saveError;

      if (!data) {
        throw new Error("The hiring request was not saved.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      setSuccess(
        isPendingReviewEdit
          ? "Changes saved. Your hiring request remains pending Apronly review."
          : submit
            ? "Hiring request submitted to Apronly for review."
            : "Hiring request saved as a draft.",
      );

      await refreshRequests();
      router.refresh();
    } catch (err) {
      console.error("Hiring request save failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the hiring request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="hiring-management"
      className="mt-8 scroll-mt-28 space-y-6"
    >
      {(error || success) && (
        <div
          role="status"
          className={`rounded-xl border p-4 text-base font-semibold ${
            error
              ? "border-danger/30 bg-danger/5 text-danger"
              : "border-sage/30 bg-sage/10 text-foreground"
          }`}
        >
          {error || success}
        </div>
      )}

      <article className="overflow-hidden rounded-[26px] border border-[#E8E2D5] bg-white p-6 shadow-[0_12px_36px_rgba(43,53,38,0.055)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#65764A]">
              Recruitment
            </p>

            <h3 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#26382B] sm:text-[2rem]">
              Hiring requirements
            </h3>

            <p className="mt-3 max-w-2xl text-lg font-medium leading-8 text-[#50564A]">
              Tell Apronly which roles you need to fill. Every request is
              reviewed before it can become a public job listing.
            </p>
          </div>

          {!showForm && (
            <button
              type="button"
              onClick={startNewRequest}
              className="rounded-full bg-[#263E2D] px-6 py-4 text-base font-bold text-white shadow-sm transition hover:bg-[#344F39] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#87966A] focus-visible:ring-offset-2"
            >
              Create requirement
            </button>
          )}
        </div>

        {showForm && (
          <div className="mt-8 space-y-7 border-t border-[#E8E2D5] pt-8">
            <div>
              <h4 className="text-2xl font-bold tracking-tight text-[#26382B]">
                {editingId
                  ? "Edit hiring requirement"
                  : "New hiring requirement"}
              </h4>

              <p className="mt-2 text-base font-medium leading-7 text-[#5B6054]">
                Fields marked with * are required.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Role / job title"
                value={form.title}
                onChange={(v) => update("title", v)}
                required
                placeholder="e.g. Head Chef"
              />

              <Field
                label="Department"
                value={form.department}
                onChange={(v) => update("department", v)}
                required
                placeholder="e.g. Kitchen"
              />

              <Field
                label="Number of openings"
                type="number"
                value={form.openings}
                onChange={(v) => update("openings", v)}
                required
              />

              <Field
                label="Hiring city"
                value={form.city}
                onChange={(v) => update("city", v)}
                required
                placeholder="e.g. Hyderabad"
              />

              <Field
                label="Minimum experience (years)"
                type="number"
                value={form.minimumExperience}
                onChange={(v) => update("minimumExperience", v)}
                placeholder="e.g. 1"
              />

              <Field
                label="Maximum experience (years)"
                type="number"
                value={form.maximumExperience}
                onChange={(v) => update("maximumExperience", v)}
                placeholder="e.g. 5"
              />

              <SelectField
                label="Employment type"
                value={form.employmentType}
                onChange={(v) => update("employmentType", v)}
                options={[
                  { value: "full_time", label: "Full time" },
                  { value: "part_time", label: "Part time" },
                  { value: "contract", label: "Contract" },
                  { value: "temporary", label: "Temporary" },
                  { value: "internship", label: "Internship" },
                ]}
              />

              <SelectField
                label="Shift"
                value={form.shiftType}
                onChange={(v) => update("shiftType", v)}
                options={[
                  { value: "day", label: "Day" },
                  { value: "night", label: "Night" },
                  { value: "rotational", label: "Rotational" },
                  { value: "flexible", label: "Flexible" },
                ]}
              />

              <Field
                label="Minimum salary (₹)"
                type="number"
                value={form.minimumSalary}
                onChange={(v) => update("minimumSalary", v)}
                placeholder="e.g. 15000"
              />

              <Field
                label="Maximum salary (₹)"
                type="number"
                value={form.maximumSalary}
                onChange={(v) => update("maximumSalary", v)}
                placeholder="e.g. 25000"
              />

              <SelectField
                label="Salary period"
                value={form.salaryPeriod}
                onChange={(v) => update("salaryPeriod", v)}
                options={[
                  { value: "hourly", label: "Hourly" },
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                  { value: "yearly", label: "Yearly" },
                ]}
              />

              <SelectField
                label="Joining timeline"
                value={form.joiningTimeline}
                onChange={(v) => update("joiningTimeline", v)}
                options={[
                  { value: "immediate", label: "Immediate" },
                  { value: "within_15_days", label: "Within 15 days" },
                  { value: "within_30_days", label: "Within 30 days" },
                  { value: "within_60_days", label: "Within 60 days" },
                  { value: "flexible", label: "Flexible" },
                ]}
              />
            </div>

            <label className="block">
              <span className={labelClass}>Required skills</span>

              <textarea
                className={inputClass}
                rows={3}
                value={form.skills}
                onChange={(e) => update("skills", e.target.value)}
                placeholder="Food preparation, inventory management, team leadership"
              />

              <span className="mt-2 block text-base font-semibold text-[#45483D]">
                Separate skills with commas.
              </span>
            </label>

            <label className="block">
              <span className={labelClass}>Job description *</span>

              <textarea
                className={inputClass}
                rows={5}
                maxLength={5000}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Describe the role, work environment and expectations."
              />
            </label>

            <label className="block">
              <span className={labelClass}>Responsibilities</span>

              <textarea
                className={inputClass}
                rows={4}
                maxLength={5000}
                value={form.responsibilities}
                onChange={(e) => update("responsibilities", e.target.value)}
                placeholder="List the main responsibilities."
              />
            </label>

            <div className="flex flex-wrap gap-3">
              {isEditingPendingReview ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void saveRequest(true)}
                  className="rounded-full bg-primary px-6 py-4 text-base font-bold text-white transition hover:bg-[#314A37] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Saving..." : "Save changes for review"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void saveRequest(false)}
                    className="rounded-full border border-border px-6 py-3.5 text-base font-bold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Saving..." : "Save draft"}
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void saveRequest(true)}
                    className="rounded-full bg-primary px-6 py-4 text-base font-bold text-white transition hover:bg-[#314A37] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Submitting..." : "Submit for review"}
                  </button>
                </>
              )}

              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setError("");
                }}
                className="rounded-full px-6 py-3.5 text-base font-semibold text-[#55584F] transition hover:bg-surface-muted disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-7 border-t border-[#E8E2D5] pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-serif text-2xl font-bold tracking-tight text-[#26382B] sm:text-[1.75rem]">Your hiring requests</h4>
              <p className="mt-2 text-base font-medium leading-7 text-[#5B6054]">
                Track the review status of your recruitment requirements.
              </p>
            </div>

            {!loading && (
              <span className="rounded-full border border-[#E5E0D4] bg-[#F4F1E8] px-4 py-2 text-sm font-bold text-[#4B5544]">
                {requests.length}{" "}
                {requests.length === 1 ? "request" : "requests"}
              </span>
            )}
          </div>

          {loading ? (
            <div className="mt-5 space-y-3">
              <div className="h-28 animate-pulse rounded-2xl bg-[#F0EFE8]" />
              <div className="h-28 animate-pulse rounded-2xl bg-[#F0EFE8]" />
            </div>
          ) : requests.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#D8DCCB] bg-[#F8F8F2] p-8">
              <p className="text-lg font-bold text-[#26382B]">
                No hiring requirements yet
              </p>

              <p className="mt-2 text-base font-medium leading-7 text-[#555F50]">
                Create your first requirement to start the recruitment process.
              </p>
            </div>
          ) : (
            <div
              className="mt-5 max-h-[min(68vh,680px)] space-y-4 overflow-y-auto overscroll-contain pr-2 [scrollbar-color:#AAB493_#F3F1E9] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[#F3F1E9] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#AAB493] hover:[&::-webkit-scrollbar-thumb]:bg-[#71845A]"
              aria-label="Hiring requests. Scroll to see more requests."
            >
              {requests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-2xl border border-[#E4E2D6] bg-gradient-to-br from-[#FFFDF9] to-[#FAF9F3] p-5 shadow-[0_3px_12px_rgba(43,53,38,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-[#B9C3A6] hover:shadow-[0_10px_26px_rgba(43,53,38,0.075)] sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h5 className="text-xl font-bold tracking-tight text-[#26382B] sm:text-[1.4rem]">
                        {request.title}
                      </h5>

                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-[#465341] sm:text-base">
                        <span>{request.department}</span>
                        <span aria-hidden="true" className="text-[#9AA18B]">•</span>
                        <span>{request.city}</span>
                        <span aria-hidden="true" className="text-[#9AA18B]">•</span>
                        <span>{request.openings} {request.openings === 1 ? "opening" : "openings"}</span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-extrabold capitalize shadow-sm ${statusStyle(request.status)}`}
                    >
                      {formatStatus(request.status)}
                    </span>
                  </div>

                  <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-[0.98rem] font-medium leading-7 text-[#50594B]">
                    {request.description}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E7E5DA] pt-4">
                    <p className="text-sm font-bold text-[#4A5145]">
                      <span className="mr-1.5 font-semibold text-[#7A806F]">Created</span>
                      {new Date(request.created_at).toLocaleDateString(
                        "en-IN",
                        { day: "2-digit", month: "short", year: "numeric" },
                      )}
                    </p>

                    {[
                      "draft",
                      "changes_requested",
                      "pending_review",
                    ].includes(request.status) && (
                      <button
                        type="button"
                        onClick={() => startEdit(request)}
                        className="rounded-full border border-[#D4DAC9] bg-white px-5 py-2.5 text-sm font-extrabold text-[#344635] shadow-sm transition hover:border-[#91A27A] hover:bg-[#F1F4EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#87966A] focus-visible:ring-offset-2"
                      >
                        Edit requirement
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </article>
    </section>
  );
}

