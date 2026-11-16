"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface HiringRequest {
  id: string;
  restaurant_id: string;
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

  const currency = request.salary_currency || "INR";
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
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

  let range = "Not specified";

  if (minimum && maximum) {
    range = `${minimum} – ${maximum}`;
  } else if (minimum) {
    range = `From ${minimum}`;
  } else if (maximum) {
    range = `Up to ${maximum}`;
  }

  return request.salary_period
    ? `${range} / ${request.salary_period}`
    : range;
}

function experienceLabel(request: HiringRequest) {
  const minimum = request.minimum_experience_years;
  const maximum = request.maximum_experience_years;

  if (minimum === null && maximum === null) return "Not specified";
  if (minimum !== null && maximum !== null) {
    return `${minimum}–${maximum} years`;
  }
  if (minimum !== null) return `${minimum}+ years`;
  return `Up to ${maximum} years`;
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <div className="mt-1 text-sm leading-6 text-foreground">
        {children}
      </div>
    </div>
  );
}

function HiringRequestCard({ request }: { request: HiringRequest }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  async function review(decision: "approved" | "rejected" | "changes_requested") {
    const trimmedNote = note.trim();

    if (
      (decision === "rejected" || decision === "changes_requested") &&
      trimmedNote.length < 10
    ) {
      setError("Please provide a review reason of at least 10 characters.");
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
    <article className="overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-sage">
              {request.department || "General"} · {request.city}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">
              {request.title}
            </h3>
            <p className="mt-2 text-sm text-muted">
              Submitted {formatDate(request.created_at)}
            </p>
          </div>

          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700">
            Pending review
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Openings">{request.openings}</Detail>
          <Detail label="Experience">{experienceLabel(request)}</Detail>
          <Detail label="Employment">
            {employmentLabels[request.employment_type] ?? request.employment_type}
          </Detail>
          <Detail label="Shift">
            {shiftLabels[request.shift_type] ?? request.shift_type}
          </Detail>
          <Detail label="Salary">{formatSalary(request)}</Detail>
          <Detail label="Joining">
            {joiningLabels[request.joining_timeline] ?? request.joining_timeline}
          </Detail>
          <Detail label="Restaurant reference">
            <span className="break-all font-mono text-xs">
              {request.restaurant_id}
            </span>
          </Detail>
          <Detail label="Request reference">
            <span className="break-all font-mono text-xs">
              {request.id}
            </span>
          </Detail>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <Detail label="Job description">
            <p className="whitespace-pre-wrap">{request.description}</p>
          </Detail>
        </div>

        {request.responsibilities && (
          <div className="mt-4">
            <Detail label="Responsibilities">
              <p className="whitespace-pre-wrap">{request.responsibilities}</p>
            </Detail>
          </div>
        )}

        {request.required_skills?.length > 0 && (
          <div className="mt-4">
            <Detail label="Required skills">
              <div className="mt-2 flex flex-wrap gap-2">
                {request.required_skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-border px-3 py-1 text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Detail>
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-5 text-sm font-medium text-sage underline-offset-4 hover:underline"
        >
          {expanded ? "Hide additional information" : "Show additional information"}
        </button>

        {expanded && (
          <div className="mt-4 grid gap-4 rounded-2xl bg-surface-muted p-4 sm:grid-cols-2">
            <Detail label="Created by">
              <span className="break-all font-mono text-xs">
                {request.created_by}
              </span>
            </Detail>
            <Detail label="Salary currency">{request.salary_currency}</Detail>
            <Detail label="Salary period">
              {request.salary_period || "Not specified"}
            </Detail>
            <Detail label="Status">{request.status}</Detail>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-surface-muted p-5 sm:p-6">
        <label
          htmlFor={`review-note-${request.id}`}
          className="block text-sm font-semibold"
        >
          Review note
        </label>
        <p className="mt-1 text-xs text-muted">
          Required for rejection or change requests. Minimum 10 characters.
        </p>

        <textarea
          id={`review-note-${request.id}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Add feedback or explain your decision..."
          disabled={busy}
          className="mt-3 w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-sage"
        />

        <div className="mt-2 text-right text-xs text-muted">
          {note.length}/2000
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void review("approved")}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Processing..." : "Approve"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void review("changes_requested")}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            Request changes
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void review("rejected")}
            className="rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-500/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </article>
  );
}

export default function HiringReview({
  requests,
  loadError,
}: HiringReviewProps) {
  return (
    <section className="mt-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-sage">RECRUITMENT CONTROL</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Hiring request approvals
          </h2>
          <p className="mt-2 text-sm text-muted">
            Review restaurant hiring requirements before they become public jobs.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
          <p className="text-xs text-muted">Awaiting review</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {requests.length}
          </p>
        </div>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-600"
        >
          Unable to load hiring requests: {loadError}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface p-10 text-center">
          <h3 className="text-lg font-semibold">No pending requests</h3>
          <p className="mt-2 text-sm text-muted">
            New restaurant hiring submissions will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {requests.map((request) => (
            <HiringRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </section>
  );
}
