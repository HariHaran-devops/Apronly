"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type CandidateOpportunity = {
  invitation_id: string;
  match_id: string;
  title: string | null;
  department: string | null;
  description: string | null;
  responsibilities: string | null;
  city: string | null;
  employment_type: string | null;
  shift_type: string | null;
  minimum_salary: number | null;
  maximum_salary: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  minimum_experience_years: number | null;
  maximum_experience_years: number | null;
  required_skills: string[] | null;
  joining_timeline: string | null;
  invitation_message: string | null;
  invitation_status: string;
  sent_at: string | null;
  expires_at: string | null;
  responded_at: string | null;
};

type Props = {
  initialOpportunities: CandidateOpportunity[];
  loadError: string | null;
};

type Filter = "all" | "pending" | "accepted" | "declined" | "expired";
type SortOrder = "newest" | "oldest";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Awaiting response" },
  { id: "accepted", label: "Accepted" },
  { id: "declined", label: "Declined" },
  { id: "expired", label: "Expired" },
];

function normaliseStatus(value: string | null | undefined): string {
  const status = (value || "pending").toLowerCase();
  return status === "invited" ? "pending" : status;
}

function formatDate(value: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatSalary(item: CandidateOpportunity): string | null {
  if (item.minimum_salary == null && item.maximum_salary == null) return null;

  const formatter = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  });
  const min =
    item.minimum_salary == null ? null : formatter.format(item.minimum_salary);
  const max =
    item.maximum_salary == null ? null : formatter.format(item.maximum_salary);
  const range = min && max ? `${min} – ${max}` : min || max;

  return `${item.salary_currency || "INR"} ${range}`;
}

function formatLabel(value: string | null): string | null {
  if (!value) return null;
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
  const appearance: Record<string, { label: string; className: string; mark: string }> = {
    pending: {
      label: "Awaiting response",
      className: "border-[#ead9b7] bg-[#fbf4e7] text-[#80602b]",
      mark: "◷",
    },
    accepted: {
      label: "Accepted",
      className: "border-[#d4e3d1] bg-[#edf4e9] text-[#386246]",
      mark: "✓",
    },
    declined: {
      label: "Declined",
      className: "border-[#e7e1d9] bg-[#f5f2ed] text-[#746b60]",
      mark: "−",
    },
    expired: {
      label: "Expired",
      className: "border-[#edd8d2] bg-[#fbefec] text-[#9a5145]",
      mark: "×",
    },
  };
  const item = appearance[status] || {
    label: formatLabel(status) || status,
    className: "border-[#e7e1d9] bg-[#f5f2ed] text-[#746b60]",
    mark: "•",
  };

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${item.className}`}>
      <span aria-hidden="true">{item.mark}</span>
      {item.label}
    </span>
  );
}

function InfoItem({
  label,
  value,
  prominent = false,
}: {
  label: string;
  value: string | null;
  prominent?: boolean;
}) {
  if (!value) return null;

  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#899389]">
        {label}
      </p>
      <p className={`mt-1.5 break-words ${prominent ? "text-base font-semibold text-[#28563c]" : "text-sm font-medium text-[#344238]"}`}>
        {value}
      </p>
    </div>
  );
}

function OpportunityCard({
  item,
  busy,
  onRespond,
}: {
  item: CandidateOpportunity;
  busy: boolean;
  onRespond: (invitationId: string, response: "accepted" | "declined") => void;
}) {
  const status = normaliseStatus(item.invitation_status);
  const pending = status === "pending";
  const salary = formatSalary(item);
  const experience =
    item.minimum_experience_years == null
      ? null
      : `${item.minimum_experience_years}${
          item.maximum_experience_years != null
            ? ` – ${item.maximum_experience_years}`
            : "+"
        } years`;
  const hasDetails = Boolean(
    item.employment_type ||
      item.shift_type ||
      salary ||
      experience ||
      item.joining_timeline ||
      item.sent_at ||
      item.expires_at,
  );

  return (
    <article className="overflow-hidden rounded-[22px] border border-[#e7e2d8] bg-white shadow-[0_5px_22px_rgba(37,55,40,0.035)] transition duration-200 hover:border-[#cbd8c8] hover:shadow-[0_9px_28px_rgba(37,55,40,0.065)]">
      <div className="p-5 sm:p-7 lg:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf2e9] text-xl text-[#386246]" aria-hidden="true">
              ✳
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2 sm:hidden">
                <StatusBadge status={status} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#829080]">
                HOSPITALITY OPPORTUNITY
              </p>
              <h3 className="mt-1.5 font-serif text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[#263b2e] sm:text-[26px]">
                {item.title || "Hospitality opportunity"}
              </h3>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[#68746c]">
                {item.department && <span>{item.department}</span>}
                {item.department && item.city && <span className="text-[#c4c8bd]">·</span>}
                {item.city && <span>{item.city}</span>}
              </div>
            </div>
          </div>
          <div className="hidden sm:block">
            <StatusBadge status={status} />
          </div>
        </div>

        {item.invitation_message && (
          <div className="mt-6 rounded-2xl border border-[#eee5d5] bg-[#fcf8f0] px-4 py-4 sm:px-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a704d]">
              A note with your invitation
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5f5547]">
              {item.invitation_message}
            </p>
          </div>
        )}

        {(item.description || item.responsibilities) && (
          <div className="mt-6 grid gap-5 md:grid-cols-2 md:gap-8">
            {item.description && (
              <div className="min-w-0">
                <h4 className="text-xs font-semibold uppercase tracking-[0.13em] text-[#829080]">
                  Role overview
                </h4>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#536057]">
                  {item.description}
                </p>
              </div>
            )}
            {item.responsibilities && (
              <div className="min-w-0">
                <h4 className="text-xs font-semibold uppercase tracking-[0.13em] text-[#829080]">
                  Responsibilities
                </h4>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#536057]">
                  {item.responsibilities}
                </p>
              </div>
            )}
          </div>
        )}

        {hasDetails && (
          <div className="mt-6 rounded-2xl bg-[#f7f7f1] p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
              <InfoItem label="Salary" value={salary ? `${salary}${item.salary_period ? ` / ${item.salary_period}` : ""}` : null} prominent />
              <InfoItem label="Employment" value={formatLabel(item.employment_type)} />
              <InfoItem label="Shift" value={formatLabel(item.shift_type)} />
              <InfoItem label="Experience" value={experience} />
              <InfoItem label="Joining timeline" value={item.joining_timeline} />
              <InfoItem label="Invited on" value={item.sent_at ? formatDate(item.sent_at) : null} />
              <InfoItem label="Respond by" value={item.expires_at ? formatDate(item.expires_at) : null} />
            </div>
          </div>
        )}

        {item.required_skills && item.required_skills.length > 0 && (
          <div className="mt-6">
            <h4 className="text-xs font-semibold uppercase tracking-[0.13em] text-[#829080]">
              Skills mentioned for this role
            </h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.required_skills.map((skill, index) => (
                <span key={`${skill}-${index}`} className="rounded-full border border-[#e3e8df] bg-[#fbfcf9] px-3.5 py-2 text-xs font-medium text-[#536b56]">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 border-t border-[#eeeae1] pt-5">
          {pending ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-md text-xs leading-5 text-[#7a857b]">
                Review the details above. Your response will be recorded securely by Apronly.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:flex sm:shrink-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRespond(item.invitation_id, "declined")}
                  className="min-h-11 rounded-xl border border-[#d8ded5] px-5 py-3 text-sm font-semibold text-[#536057] transition hover:bg-[#f6f7f2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRespond(item.invitation_id, "accepted")}
                  className="min-h-11 rounded-xl bg-[#28563c] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#20472f] focus:outline-none focus:ring-2 focus:ring-[#9bb39a] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Submitting…" : "Accept invitation"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-[#46554a]">
                {status === "accepted" && "You accepted this opportunity."}
                {status === "declined" && "You declined this invitation."}
                {status === "expired" && "This invitation has expired."}
                {!["accepted", "declined", "expired"].includes(status) && "This invitation is no longer awaiting a response."}
              </p>
              {item.responded_at && (
                <p className="text-xs text-[#899389]">Responded {formatDate(item.responded_at)}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function CandidateOpportunities({
  initialOpportunities,
  loadError,
}: Props) {
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(loadError);
  const [filter, setFilter] = useState<Filter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const counts = useMemo(() => {
    const result: Record<Filter, number> = {
      all: opportunities.length,
      pending: 0,
      accepted: 0,
      declined: 0,
      expired: 0,
    };

    opportunities.forEach((item) => {
      const status = normaliseStatus(item.invitation_status) as Filter;
      if (status !== "all" && status in result) result[status] += 1;
    });

    return result;
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    const filtered = opportunities.filter((item) =>
      filter === "all" ? true : normaliseStatus(item.invitation_status) === filter,
    );

    return [...filtered].sort((a, b) => {
      const first = a.sent_at ? new Date(a.sent_at).getTime() : 0;
      const second = b.sent_at ? new Date(b.sent_at).getTime() : 0;
      const safeFirst = Number.isNaN(first) ? 0 : first;
      const safeSecond = Number.isNaN(second) ? 0 : second;
      return sortOrder === "newest" ? safeSecond - safeFirst : safeFirst - safeSecond;
    });
  }, [opportunities, filter, sortOrder]);

  async function respond(
    invitationId: string,
    response: "accepted" | "declined",
  ) {
    setBusyId(invitationId);
    setMessage(null);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc(
        "respond_to_candidate_invitation",
        {
          p_invitation_id: invitationId,
          p_response: response,
        },
      );

      if (rpcError) {
        setError(rpcError.message || "We couldn't submit your response. Please try again.");
        return;
      }

      if (!data) {
        setOpportunities((current) =>
          current.map((item) =>
            item.invitation_id === invitationId
              ? { ...item, invitation_status: "expired" }
              : item,
          ),
        );
        setMessage("This invitation has expired and can no longer be accepted.");
        return;
      }

      setOpportunities((current) =>
        current.map((item) =>
          item.invitation_id === invitationId
            ? {
                ...item,
                invitation_status: response,
                responded_at: new Date().toISOString(),
              }
            : item,
        ),
      );

      setMessage(
        response === "accepted"
          ? "Your acceptance has been recorded by Apronly."
          : "Your response has been recorded.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-6">
      {(message || error) && (
        <div
          role={error ? "alert" : "status"}
          className={`mb-5 rounded-2xl border px-4 py-3.5 text-sm ${
            error
              ? "border-[#edd8d2] bg-[#fbefec] text-[#914b40]"
              : "border-[#d9e5d4] bg-[#eef4e9] text-[#386246]"
          }`}
        >
          {error ? `We couldn't load or update your invitations: ${error}` : message}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-[#e8e3d8] bg-white p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2" aria-label="Filter invitations">
          {FILTERS.map((item) => {
            const count = counts[item.id];
            if (item.id === "declined" && count === 0) return null;

            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={active}
                className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-[#28563c] bg-[#28563c] text-white"
                    : "border-[#e5e4db] bg-[#fff] text-[#5c685e] hover:border-[#cbd8c8] hover:bg-[#f7f8f3]"
                }`}
              >
                {item.label}
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-white/15 text-white" : "bg-[#f0f1eb] text-[#69756b]"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-3 text-xs font-medium text-[#788379]">
          Sort
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
            className="min-h-10 rounded-xl border border-[#e2e3da] bg-[#fbfbf8] px-3 text-sm text-[#344238] outline-none transition focus:border-[#789579] focus:ring-2 focus:ring-[#dce7d8]"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      {filteredOpportunities.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#dcded3] bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf2e9] text-2xl text-[#386246]" aria-hidden="true">
            ✳
          </div>
          <h3 className="mt-5 font-serif text-xl font-semibold text-[#293d30]">
            {opportunities.length === 0
              ? "Your next opportunity will appear here"
              : `No ${filter} invitations`}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#788379]">
            {opportunities.length === 0
              ? "There are no invitations in your workspace yet. When Apronly sends you an opportunity, you can review the details here."
              : "There are no invitations in this category right now. Choose another filter to see your invitations."}
          </p>
          {filter !== "all" && opportunities.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="mt-5 text-sm font-semibold text-[#28563c] underline decoration-[#b7c9b4] underline-offset-4 hover:text-[#20472f]"
            >
              View all invitations
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5">
          {filteredOpportunities.map((item) => (
            <OpportunityCard
              key={item.invitation_id}
              item={item}
              busy={busyId === item.invitation_id}
              onRespond={respond}
            />
          ))}
        </div>
      )}
    </section>
  );
}
