
"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface HiringOutlet {
  id: string;
  name: string;
  city: string;
  address_line1: string | null;
  address_line2: string | null;
  landmark: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  is_primary: boolean;
}

export interface HiringRequest {
  id: string;
  restaurant_id: string;
  restaurant_name?: string;
  primary_outlet?: HiringOutlet | null;
  created_by: string;
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
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

interface HiringReviewProps {
  requests: HiringRequest[];
  loadError?: string | null;
}

type StatusFilter =
  | "pending_review"
  | "approved"
  | "changes_requested"
  | "rejected";

const statusOptions: {
  value: StatusFilter;
  label: string;
}[] = [
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "rejected", label: "Rejected" },
];

const statusLabels: Record<string, string> = {
  pending_review: "Pending Review",
  approved: "Approved",
  changes_requested: "Changes Requested",
  rejected: "Rejected",
};

const employmentLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  temporary: "Temporary",
  internship: "Internship",
};

const shiftLabels: Record<string, string> = {
  day: "Day",
  night: "Night",
  rotational: "Rotational",
  flexible: "Flexible",
};

const joiningLabels: Record<string, string> = {
  immediate: "Immediately",
  within_15_days: "Within 15 days",
  within_30_days: "Within 30 days",
  within_60_days: "Within 60 days",
  flexible: "Flexible",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSalary(request: HiringRequest) {
  if (
    request.minimum_salary === null &&
    request.maximum_salary === null
  ) {
    return "Not specified";
  }

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: request.salary_currency || "INR",
    maximumFractionDigits: 0,
  });

  const minimum =
    request.minimum_salary === null
      ? null
      : formatter.format(request.minimum_salary);

  const maximum =
    request.maximum_salary === null
      ? null
      : formatter.format(request.maximum_salary);

  const range =
    minimum && maximum
      ? `${minimum} – ${maximum}`
      : minimum
        ? `From ${minimum}`
        : `Up to ${maximum}`;

  return request.salary_period
    ? `${range} / ${request.salary_period}`
    : range;
}

function experienceLabel(request: HiringRequest) {
  const minimum = request.minimum_experience_years;
  const maximum = request.maximum_experience_years;

  if (minimum === null && maximum === null) {
    return "Not specified";
  }

  if (minimum !== null && maximum !== null) {
    return `${minimum}–${maximum} years`;
  }

  if (minimum !== null) return `${minimum}+ years`;

  return `Up to ${maximum} years`;
}

function Metric({
  label,
  value,
  detail,
  featured = false,
}: {
  label: string;
  value: string | number;
  detail: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        featured
          ? "border-[#174A35] bg-[#123C2C] text-white"
          : "border-[#E8E2D7] bg-[#FBFAF6] text-[#26352D]"
      }`}
    >
      <p
        className={`text-sm font-semibold ${
          featured ? "text-[#D0DFD2]" : "text-[#657365]"
        }`}
      >
        {label}
      </p>

      <p className="mt-2 font-sans text-3xl font-bold tracking-tight">
        {value}
      </p>

      <p
        className={`mt-1 text-xs font-medium ${
          featured ? "text-[#C5D6C8]" : "text-[#73786F]"
        }`}
      >
        {detail}
      </p>
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-[#657365]">
        {label}
      </p>

      <div className="mt-1.5 break-words text-sm font-medium leading-6 text-[#26352D]">
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_review:
      "border-[#EEDDBB] bg-[#FBF3E3] text-[#986B2C]",
    approved:
      "border-[#DCE3D8] bg-[#EEF2EA] text-[#526B50]",
    changes_requested:
      "border-[#E7DCCB] bg-[#F5EFE4] text-[#896B3E]",
    rejected:
      "border-[#E8C9C2] bg-[#FCF1EF] text-[#A34E43]",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-bold ${
        styles[status] ??
        "border-[#E8E2D7] bg-[#F4F1E9] text-[#73786F]"
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

function PrimaryOutletDetails({
  outlet,
}: {
  outlet?: HiringOutlet | null;
}) {
  if (!outlet) {
    return (
      <div className="rounded-xl border border-[#E8E2D7] bg-[#F4F1E9] p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[#657365]">
          Registered outlet
        </p>
        <p className="mt-1 text-sm font-medium text-[#73786F]">
          No primary outlet information available.
        </p>
      </div>
    );
  }

  const addressParts = [
    outlet.address_line1,
    outlet.address_line2,
    outlet.landmark ? `Near ${outlet.landmark}` : null,
    [
      outlet.city,
      outlet.state,
      outlet.postal_code,
    ]
      .filter(Boolean)
      .join(", "),
    outlet.country,
  ].filter(Boolean);

  return (
    <div className="rounded-xl border border-[#E8E2D7] bg-[#F4F1E9] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-[#657365]">
          Registered outlet
        </span>

        {outlet.is_primary && (
          <span className="rounded-full bg-[#E8EEE3] px-2 py-0.5 text-[10px] font-bold text-[#526B50]">
            Primary
          </span>
        )}
      </div>

      <p className="mt-1 text-sm font-bold text-[#26352D]">
        {outlet.name}
      </p>

      <p className="mt-1 text-sm font-medium leading-5 text-[#536156]">
        {addressParts.length
          ? addressParts.join(", ")
          : "Address not provided"}
      </p>
    </div>
  );
}

function HiringRequestCard({
  request,
}: {
  request: HiringRequest;
}) {
  const router = useRouter();

  // Every application starts closed.
  // Each card owns its own independent dropdown state.
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isPending = request.status === "pending_review";

  async function review(
    decision: "approved" | "rejected" | "changes_requested"
  ) {
    const trimmedNote = note.trim();

    if (
      (decision === "rejected" ||
        decision === "changes_requested") &&
      trimmedNote.length < 10
    ) {
      setError(
        "Please provide a review reason of at least 10 characters."
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      const supabase = createClient();

      const { error: reviewError } = await supabase.rpc(
        "review_restaurant_hiring_request",
        {
          p_request_id: request.id,
          p_decision: decision,
          p_review_note: trimmedNote || null,
        }
      );

      if (reviewError) throw reviewError;

      router.refresh();
    } catch (err) {
      console.error("Hiring request review failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit this review. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border border-[#E8E2D7] border-l-[3px] border-l-[#526B50] bg-[#FBFAF6] transition hover:border-[#C9D3C5]">
      {/* Compact application header - always visible */}
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        aria-controls={`application-details-${request.id}`}
        className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-[#F7F5EF] sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#657365]">
              {request.department || "General"}
            </span>

            <span className="text-[#C0BBAE]">·</span>

            <span className="text-xs font-semibold text-[#536156]">
              {request.city}
            </span>
          </div>

          <h3 className="mt-1 font-sans text-lg font-bold tracking-tight text-[#26352D]">
            {request.title}
          </h3>

          <p className="mt-0.5 text-sm font-bold text-[#526B50]">
            {request.restaurant_name ||
              "Restaurant name unavailable"}
          </p>

          <p className="mt-1 text-xs font-medium text-[#73786F]">
            Submitted {formatDate(request.created_at)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <StatusBadge status={request.status} />

          <svg
            viewBox="0 0 20 20"
            className={`h-4 w-4 text-[#526B50] transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </div>
      </button>

      {/* Dropdown content - no individual scrolling */}
      {expanded && (
        <div
          id={`application-details-${request.id}`}
          className="border-t border-[#E8E2D7] px-4 pb-5 pt-4 sm:px-5"
        >
          {/* Key hiring information */}
          <div className="grid grid-cols-2 gap-4 border-b border-[#EAE5DB] pb-4 sm:grid-cols-3 lg:grid-cols-6">
            <Detail label="Openings">
              {request.openings}
            </Detail>

            <Detail label="Experience">
              {experienceLabel(request)}
            </Detail>

            <Detail label="Employment">
              {employmentLabels[request.employment_type] ??
                request.employment_type}
            </Detail>

            <Detail label="Shift">
              {shiftLabels[request.shift_type] ??
                request.shift_type}
            </Detail>

            <Detail label="Salary">
              {formatSalary(request)}
            </Detail>

            <Detail label="Joining timeline">
              {joiningLabels[request.joining_timeline] ??
                request.joining_timeline}
            </Detail>
          </div>

          {/* Outlet information */}
          <div className="mt-4">
            <PrimaryOutletDetails
              outlet={request.primary_outlet}
            />
          </div>

          {/* Job description */}
          <div className="mt-4">
            <Detail label="Job description">
              <p className="whitespace-pre-wrap">
                {request.description}
              </p>
            </Detail>
          </div>

          {/* Responsibilities */}
          {request.responsibilities && (
            <div className="mt-4">
              <Detail label="Responsibilities">
                <p className="whitespace-pre-wrap">
                  {request.responsibilities}
                </p>
              </Detail>
            </div>
          )}

          {/* Required skills */}
          {request.required_skills?.length > 0 && (
            <div className="mt-4">
              <Detail label="Required skills">
                <div className="mt-2 flex flex-wrap gap-2">
                  {request.required_skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-[#E4E0D5] bg-white px-3 py-1 text-xs font-semibold text-[#536156]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </Detail>
            </div>
          )}

          {/* Additional information */}
          <details className="mt-4 rounded-xl border border-[#E8E2D7] bg-[#F8F6F0]">
            <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-[#526B50]">
              Additional information
            </summary>

            <div className="grid gap-4 border-t border-[#E8E2D7] p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Created by">
                <span className="break-all font-mono text-xs">
                  {request.created_by}
                </span>
              </Detail>

              <Detail label="Restaurant reference">
                <span className="break-all font-mono text-xs">
                  {request.restaurant_id}
                </span>
              </Detail>

              <Detail label="Request ID">
                <span className="break-all font-mono text-xs">
                  {request.id}
                </span>
              </Detail>

              <Detail label="Salary currency">
                {request.salary_currency}
              </Detail>

              <Detail label="Salary period">
                {request.salary_period || "Not specified"}
              </Detail>

              <Detail label="Last reviewed">
                {request.reviewed_at
                  ? formatDate(request.reviewed_at)
                  : "Not reviewed"}
              </Detail>

              {request.review_note && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <Detail label="Review note">
                    {request.review_note}
                  </Detail>
                </div>
              )}
            </div>
          </details>

          {/* Approval controls */}
          {isPending && (
            <div className="mt-5 rounded-xl border border-[#E8E2D7] bg-[#F4F1E9] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#26352D]">
                    Review decision
                  </p>

                  <p className="mt-1 text-xs font-medium text-[#73786F]">
                    A reason is required for rejection or change
                    requests.
                  </p>
                </div>

                <span className="text-xs font-semibold tabular-nums text-[#73786F]">
                  {note.length}/2000
                </span>
              </div>

              <textarea
                id={`review-note-${request.id}`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={2000}
                rows={2}
                placeholder="Add an optional approval note or feedback..."
                disabled={busy}
                className="mt-3 w-full resize-y rounded-xl border border-[#E3DED2] bg-[#FBFAF6] px-4 py-3 text-sm font-medium text-[#26352D] outline-none transition placeholder:font-normal placeholder:text-[#898679] focus:border-[#8A9A7B] disabled:opacity-60"
              />

              {error && (
                <p
                  role="alert"
                  className="mt-3 text-sm font-semibold text-red-700"
                >
                  {error}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void review("approved")}
                  className="rounded-xl bg-[#174A35] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#103B2A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Processing..." : "✓ Approve"}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void review("changes_requested")}
                  className="rounded-xl border border-[#D8D2C5] bg-[#FBFAF6] px-4 py-2.5 text-sm font-bold text-[#536156] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Request changes
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void review("rejected")}
                  className="rounded-xl border border-[#E8C9C2] bg-[#FBFAF6] px-4 py-2.5 text-sm font-bold text-[#A34E43] transition hover:bg-[#FCF1EF] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function HiringReview({
  requests,
  loadError,
}: HiringReviewProps) {
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] =
    useState<StatusFilter>("pending_review");

  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">(
    "oldest"
  );

  const counts = useMemo(
    () => ({
      pending_review: requests.filter(
        (request) => request.status === "pending_review"
      ).length,
      approved: requests.filter(
        (request) => request.status === "approved"
      ).length,
      changes_requested: requests.filter(
        (request) => request.status === "changes_requested"
      ).length,
      rejected: requests.filter(
        (request) => request.status === "rejected"
      ).length,
    }),
    [requests]
  );

  const pendingRequests = requests.filter(
    (request) => request.status === "pending_review"
  );

  const totalOpenings = pendingRequests.reduce(
    (total, request) => total + (request.openings || 0),
    0
  );

  const cityCount = new Set(
    pendingRequests.map((request) => request.city).filter(Boolean)
  ).size;

  const departmentCount = new Set(
    pendingRequests
      .map((request) => request.department)
      .filter(Boolean)
  ).size;

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return requests
      .filter((request) => request.status === activeStatus)
      .filter((request) => {
        if (!term) return true;

        return [
          request.title,
          request.department,
          request.city,
          request.restaurant_name,
          request.primary_outlet?.name,
          request.primary_outlet?.city,
          request.primary_outlet?.address_line1,
          request.primary_outlet?.address_line2,
          request.primary_outlet?.postal_code,
        ].some((value) => value?.toLowerCase().includes(term));
      })
      .sort((a, b) => {
        const difference =
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime();

        return sortOrder === "oldest"
          ? difference
          : -difference;
      });
  }, [requests, activeStatus, search, sortOrder]);

  return (
    <section>
      {/* Section heading */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#71836A]">
            Recruitment Control
          </p>

          <h2 className="mt-2 font-sans text-2xl font-bold tracking-tight text-[#26352D]">
            Hiring overview
          </h2>

          <p className="mt-1 text-sm font-medium text-[#536156]">
            Monitor submissions and manage restaurant hiring requests.
          </p>
        </div>

        <span className="rounded-full border border-[#DCE3D8] bg-[#EEF2EA] px-3 py-1.5 text-xs font-bold text-[#526B50]">
          Latest {requests.length} requests loaded
        </span>
      </div>

      {/* Metrics */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Pending requests"
          value={counts.pending_review}
          detail="Awaiting admin decision"
          featured
        />

        <Metric
          label="Total openings"
          value={totalOpenings}
          detail="Across pending requests"
        />

        <Metric
          label="Cities represented"
          value={cityCount}
          detail="Pending request locations"
        />

        <Metric
          label="Departments"
          value={departmentCount}
          detail="Pending hiring areas"
        />

        <Metric
          label="Approved"
          value={counts.approved}
          detail="Within loaded requests"
        />
      </div>

      {/* Status filters */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-[#E8E2D7] bg-[#FBFAF6]">
        <div className="flex gap-2 overflow-x-auto px-3 py-3 sm:px-4">
          {statusOptions.map((option) => {
            const selected = activeStatus === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveStatus(option.value)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition ${
                  selected
                    ? "border-[#174A35] bg-[#174A35] text-white"
                    : "border-[#E8E2D7] bg-white text-[#536156] hover:border-[#B9C7B4]"
                }`}
              >
                {option.label}

                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    selected
                      ? "bg-white/15 text-white"
                      : "bg-[#F0EEE7] text-[#536156]"
                  }`}
                >
                  {counts[option.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and sorting */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#E8E2D7] bg-[#FBFAF6] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[#26352D]">
            {
              statusOptions.find(
                (option) => option.value === activeStatus
              )?.label
            }
          </p>

          <p className="mt-1 text-xs font-medium text-[#73786F]">
            Search by role, restaurant, department, city or outlet.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search hiring requests..."
            className="w-full rounded-xl border border-[#E3DED2] bg-white px-4 py-2.5 text-sm font-medium text-[#26352D] outline-none transition placeholder:font-normal placeholder:text-[#898679] focus:border-[#8A9A7B] sm:w-64"
          />

          <select
            value={sortOrder}
            onChange={(event) =>
              setSortOrder(
                event.target.value as "newest" | "oldest"
              )
            }
            className="rounded-xl border border-[#E3DED2] bg-white px-3 py-2.5 text-sm font-semibold text-[#536156] outline-none focus:border-[#8A9A7B]"
          >
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
          </select>
        </div>
      </div>

      {/* ONE shared scrollable application block */}
      {loadError ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm font-medium text-red-700"
        >
          Unable to load hiring requests: {loadError}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#DCD7CA] bg-[#FBFAF6] px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2EA] text-[#526B50]">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
              <path d="M14 3v5h5M9 13h6M9 17h6" />
            </svg>
          </div>

          <h3 className="mt-4 font-sans text-xl font-bold text-[#26352D]">
            {search
              ? "No matching requests"
              : activeStatus === "pending_review"
                ? "You're all caught up"
                : `No ${statusLabels[activeStatus].toLowerCase()} requests`}
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-[#536156]">
            {search
              ? "Try a different search term."
              : "Requests in this status will appear here when available."}
          </p>
        </div>
      ) : (
        <div
          className="max-h-[65vh] space-y-3 overflow-y-auto overscroll-y-contain rounded-2xl border border-[#E8E2D7] bg-[#F4F1E9] p-2.5 sm:p-3"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#A8B5A2 transparent",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {filteredRequests.map((request) => (
            <HiringRequestCard
              key={request.id}
              request={request}
            />
          ))}
        </div>
      )}
    </section>
  );
}
