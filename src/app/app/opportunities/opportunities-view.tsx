"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CandidateOpportunity } from "../candidate-opportunities";

type Props = {
  initialOpportunities: CandidateOpportunity[];
  loadError: string | null;
};

type StatusFilter = "all" | "pending" | "accepted" | "expired" | "declined";
type SortOrder = "newest" | "oldest";

function statusOf(value: string | null | undefined): StatusFilter {
  const status = (value || "pending").toLowerCase();

  if (status === "invited") return "pending";
  if (status === "accepted") return "accepted";
  if (status === "declined") return "declined";
  if (status === "expired") return "expired";

  return "pending";
}

function label(value: string | null | undefined) {
  if (!value) return null;

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function dateLabel(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function salaryLabel(item: CandidateOpportunity) {
  if (item.minimum_salary == null && item.maximum_salary == null) {
    return null;
  }

  const formatter = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  });

  const minimum =
    item.minimum_salary == null
      ? null
      : formatter.format(item.minimum_salary);

  const maximum =
    item.maximum_salary == null
      ? null
      : formatter.format(item.maximum_salary);

  const range =
    minimum && maximum
      ? `${minimum} – ${maximum}`
      : minimum || maximum;

  return `${item.salary_currency || "INR"} ${range}${
    item.salary_period ? ` / ${item.salary_period}` : ""
  }`;
}

function experienceLabel(item: CandidateOpportunity) {
  if (item.minimum_experience_years == null) return null;

  if (item.maximum_experience_years == null) {
    return `${item.minimum_experience_years}+ years`;
  }

  return `${item.minimum_experience_years} – ${item.maximum_experience_years} years`;
}

function Icon({
  name,
  size = 22,
}: {
  name: "briefcase" | "clock" | "check" | "expired" | "chef" | "pin" | "search" | "sun" | "chart" | "calendar" | "tag" | "message";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="14" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="m7 12 3 3 7-7" />
        </svg>
      );
    case "expired":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="m8 8 8 8m0-8-8 8" />
        </svg>
      );
    case "chef":
      return (
        <svg {...common}>
          <path d="M6 11a5 5 0 0 1 1-9 5 5 0 0 1 10 0 5 5 0 0 1 1 9v9H6z" />
          <path d="M6 15h12M9 20v2m6-2v2" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="10.8" cy="10.8" r="7" />
          <path d="m16 16 5 5" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 20V12m5 8V8m5 12V4m5 16v-9" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M20 13 13 20 3 10V4h6z" />
          <circle cx="7.5" cy="7.5" r="1" />
        </svg>
      );
    case "message":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
        </svg>
      );
  }
}

function StatusBadge({ status }: { status: StatusFilter }) {
  const config = {
    pending: {
      text: "Awaiting response",
      className: "bg-[#fff0d5] text-[#9a5600]",
      icon: "clock" as const,
    },
    accepted: {
      text: "Accepted",
      className: "bg-[#e8f1e2] text-[#23613a]",
      icon: "check" as const,
    },
    declined: {
      text: "Declined",
      className: "bg-[#f1ece8] text-[#77645a]",
      icon: "expired" as const,
    },
    expired: {
      text: "Expired",
      className: "bg-[#fce8e6] text-[#a33b32]",
      icon: "expired" as const,
    },
    all: {
      text: "All",
      className: "bg-[#f1f2eb] text-[#536157]",
      icon: "briefcase" as const,
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold ${config.className}`}
    >
      <Icon name={config.icon} size={14} />
      {config.text}
    </span>
  );
}

function OpportunityCard({
  item,
  busy,
  onRespond,
}: {
  item: CandidateOpportunity;
  busy: boolean;
  onRespond: (
    invitationId: string,
    response: "accepted" | "declined",
  ) => void;
}) {
  const status = statusOf(item.invitation_status);
  const pending = status === "pending";
  const salary = salaryLabel(item);
  const experience = experienceLabel(item);

  const detailItems = [
    {
      icon: "briefcase" as const,
      label: "Employment type",
      value: label(item.employment_type),
    },
    {
      icon: "sun" as const,
      label: "Shift",
      value: label(item.shift_type),
    },
    {
      icon: "chart" as const,
      label: "Experience",
      value: experience,
    },
    {
      icon: "calendar" as const,
      label: "Joining timeline",
      value: item.joining_timeline,
    },
  ].filter((detail) => detail.value);

  return (
    <article className="grid min-w-0 overflow-hidden rounded-[18px] border border-[#e5dfd5] bg-[#fffefa] shadow-[0_2px_8px_rgba(36,48,35,0.035)] transition hover:border-[#cbd8c8] hover:shadow-[0_7px_24px_rgba(36,48,35,0.07)] lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.95fr)_minmax(230px,0.95fr)]">
      {/* Role information */}
      <div className="min-w-0 p-5 sm:p-6 lg:p-5 xl:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-[15px] bg-[#eaf0e2] text-[#07552f]">
            <Icon name="chef" size={40} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif text-[24px] font-bold leading-[1.12] tracking-[-0.35px] text-[#142018] sm:text-[27px]">
                {item.title || "Hospitality opportunity"}
              </h2>
              <StatusBadge status={status} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#37443a]">
              {item.department && (
                <span>{label(item.department)}</span>
              )}
              {item.department && item.city && (
                <span className="text-[#a6ada2]">|</span>
              )}
              {item.city && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="pin" size={14} />
                  {item.city}
                </span>
              )}
            </div>
          </div>
        </div>

        {item.invitation_message && (
          <div className="mt-4 rounded-xl bg-[#fff4df] px-3.5 py-3">
            <p className="flex items-center gap-2 text-[11px] font-bold text-[#604a2d]">
              <Icon name="message" size={16} />
              Message with your invitation
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-[1.6] text-[#514638]">
              {item.invitation_message}
            </p>
          </div>
        )}

        {item.description && (
          <p className="mt-4 whitespace-pre-wrap text-[13px] leading-[1.65] text-[#39463c]">
            {item.description}
          </p>
        )}

        {item.responsibilities && (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#879387]">
              Responsibilities
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-[1.6] text-[#39463c]">
              {item.responsibilities}
            </p>
          </div>
        )}
      </div>

      {/* Employment details */}
      <div className="border-t border-[#e9e4db] p-5 sm:p-6 lg:border-l lg:border-t-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          {detailItems.map((detail) => (
            <div key={detail.label} className="flex min-w-0 gap-2.5">
              <span className="mt-0.5 shrink-0 text-[#07552f]">
                <Icon name={detail.icon} size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] text-[#758176]">
                  {detail.label}
                </p>
                <p className="mt-0.5 break-words text-[14px] font-semibold text-[#17251c]">
                  {detail.value}
                </p>
              </div>
            </div>
          ))}

          {salary && (
            <div className="col-span-2 flex min-w-0 gap-2.5">
              <span className="mt-0.5 shrink-0 text-[#07552f]">
                <Icon name="briefcase" size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] text-[#758176]">Salary</p>
                <p className="mt-0.5 break-words text-[15px] font-bold tracking-[-0.15px] text-[#17251c]">
                  {salary}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-[#e9e4db] pt-4">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-[#758176]">
            {item.sent_at && (
              <span>Invited {dateLabel(item.sent_at)}</span>
            )}
            {item.expires_at && (
              <span>Respond by {dateLabel(item.expires_at)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Skills and actions */}
      <div className="flex min-w-0 flex-col justify-between gap-5 border-t border-[#e9e4db] p-5 sm:p-6 lg:border-l lg:border-t-0">
        <div>
          <h3 className="flex items-center gap-2 text-[13px] font-bold text-[#17251c]">
            <span className="text-[#07552f]">
              <Icon name="tag" size={18} />
            </span>
            Required skills
          </h3>

          {item.required_skills?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.required_skills.map((skill, index) => (
                <span
                  key={`${skill}-${index}`}
                  className="rounded-full bg-[#eaf0e2] px-3 py-1.5 text-[11px] font-semibold text-[#25472f]"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-[#899389]">
              No specific skills listed.
            </p>
          )}
        </div>

        {pending ? (
          <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(82px,0.8fr)] gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onRespond(item.invitation_id, "accepted")}
              className="min-h-11 rounded-xl bg-[#07552f] px-3 py-2.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#064326] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8eae91] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Submitting..." : "Accept invitation"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRespond(item.invitation_id, "declined")}
              className="min-h-11 rounded-xl border border-[#c9cec3] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#405247] transition hover:bg-[#f4f5ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8eae91] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-[#edf2e8] p-3">
            <div className="flex items-center gap-2 text-[#28563c]">
              <Icon
                name={status === "accepted" ? "check" : status === "expired" ? "expired" : "clock"}
                size={17}
              />
              <p className="text-[12px] font-semibold">
                {status === "accepted" && "You accepted this opportunity."}
                {status === "declined" && "You declined this invitation."}
                {status === "expired" && "This invitation has expired."}
              </p>
            </div>
            {item.responded_at && (
              <p className="mt-1.5 text-[10px] text-[#718076]">
                Responded {dateLabel(item.responded_at)}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default function OpportunitiesView({
  initialOpportunities,
  loadError,
}: Props) {
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(loadError);

  const counts = useMemo(() => {
    return {
      all: opportunities.length,
      pending: opportunities.filter((item) => statusOf(item.invitation_status) === "pending").length,
      accepted: opportunities.filter((item) => statusOf(item.invitation_status) === "accepted").length,
      declined: opportunities.filter((item) => statusOf(item.invitation_status) === "declined").length,
      expired: opportunities.filter((item) => statusOf(item.invitation_status) === "expired").length,
    };
  }, [opportunities]);

  const cities = useMemo(
    () => [...new Set(opportunities.map((item) => item.city).filter((value): value is string => Boolean(value)))].sort(),
    [opportunities],
  );

  const roles = useMemo(
    () => [...new Set(opportunities.map((item) => item.title).filter((value): value is string => Boolean(value)))].sort(),
    [opportunities],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return opportunities
      .filter((item) => {
        const matchesSearch =
          !query ||
          [
            item.title,
            item.department,
            item.city,
            item.description,
            item.responsibilities,
            ...(item.required_skills ?? []),
          ]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(query));

        const matchesCity = city === "all" || item.city === city;
        const matchesRole = role === "all" || item.title === role;
        const matchesStatus = status === "all" || statusOf(item.invitation_status) === status;

        return matchesSearch && matchesCity && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        const first = a.sent_at ? new Date(a.sent_at).getTime() : 0;
        const second = b.sent_at ? new Date(b.sent_at).getTime() : 0;
        const safeFirst = Number.isNaN(first) ? 0 : first;
        const safeSecond = Number.isNaN(second) ? 0 : second;

        return sort === "newest" ? safeSecond - safeFirst : safeFirst - safeSecond;
      });
  }, [opportunities, search, city, role, status, sort]);

  async function respond(
    invitationId: string,
    response: "accepted" | "declined",
  ) {
    setBusyId(invitationId);
    setFeedback(null);
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
        setFeedback("This invitation has expired and can no longer be accepted.");
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

      setFeedback(
        response === "accepted"
          ? "Your acceptance has been recorded by Apronly."
          : "Your response has been recorded.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const selectClass =
    "h-[43px] min-w-0 rounded-xl border border-[#dedfd5] bg-white px-3 text-[13px] text-[#344238] outline-none transition focus:border-[#789579] focus:ring-2 focus:ring-[#dce7d8] focus-visible:outline-none";

  return (
    <main className="min-h-screen bg-[#fbf9f3] text-[#17251c]">
      {/* Page hero */}
      <section className="relative -mx-5 overflow-hidden border-b border-[#e8e3d8] px-5 py-8 sm:-mx-7 sm:px-7 lg:-mx-[38px] lg:px-[48px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/candidate-hero.jpg')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#fbf9f3] via-[#fbf9f3]/95 to-[#fbf9f3]/15" />

        <div className="relative z-10">
          <p className="text-[13px] font-bold tracking-[0.2em] text-[#07552f]">
            OPPORTUNITIES
          </p>
          <h1 className="mt-2 font-serif text-[36px] font-bold leading-[1.08] tracking-[-1.1px] text-[#101710] sm:text-[42px]">
            Your Opportunities
          </h1>
          <p className="mt-1 max-w-2xl text-[15px] leading-7 text-[#465148]">
            Invitations from verified restaurants that match your profile and preferences.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-5 sm:px-7 lg:px-[32px]">
        {/* Summary statistics */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex min-h-[86px] items-center gap-4 rounded-[16px] bg-[#eaf0e2] px-5 py-4">
            <span className="text-[#07552f]">
              <Icon name="briefcase" size={42} />
            </span>
            <div>
              <p className="font-serif text-[29px] font-bold leading-none text-[#101710]">
                {counts.all}
              </p>
              <p className="mt-1 text-[13px] text-[#202820]">All Opportunities</p>
            </div>
          </div>

          {[
            { label: "Awaiting Response", value: counts.pending, icon: "clock" as const },
            { label: "Accepted", value: counts.accepted, icon: "check" as const },
            { label: "Expired", value: counts.expired, icon: "expired" as const },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex min-h-[86px] items-center gap-4 rounded-[16px] border border-[#e5dfd5] bg-white/65 px-5 py-4"
            >
              <span className="text-[#07552f]">
                <Icon name={stat.icon} size={39} />
              </span>
              <div>
                <p className="font-serif text-[29px] font-bold leading-none text-[#101710]">
                  {stat.value}
                </p>
                <p className="mt-1 text-[13px] text-[#202820]">{stat.label}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Search and filters */}
        <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.7fr)_minmax(150px,.85fr)_minmax(150px,.85fr)_minmax(170px,.9fr)]">
          <label className="relative block">
            <span className="sr-only">Search opportunities</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#344238]">
              <Icon name="search" size={19} />
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by role, skills or city..."
              className="h-[43px] w-full rounded-xl border border-[#dedfd5] bg-white pl-10 pr-3 text-[13px] text-[#344238] outline-none placeholder:text-[#7d857d] focus:border-[#789579] focus:ring-2 focus:ring-[#dce7d8] focus-visible:outline-none"
            />
          </label>

          <label>
            <span className="sr-only">Filter by city</span>
            <select value={city} onChange={(event) => setCity(event.target.value)} className={selectClass + " w-full"}>
              <option value="all">All Cities</option>
              {cities.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>

          <label>
            <span className="sr-only">Filter by role</span>
            <select value={role} onChange={(event) => setRole(event.target.value)} className={selectClass + " w-full"}>
              <option value="all">All Roles</option>
              {roles.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>

          <label className="flex items-center gap-2 text-[12px] font-semibold text-[#344238]">
            Sort by
            <select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)} className={selectClass + " flex-1"}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </label>
        </section>

        {/* Quick status filters */}
        <section
          aria-label="Filter invitations by status"
          className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#e7e2d8] bg-white/75 p-2.5"
        >
          {([
            { value: "all", label: "All", count: counts.all },
            { value: "pending", label: "Awaiting response", count: counts.pending },
            { value: "accepted", label: "Accepted", count: counts.accepted },
            { value: "declined", label: "Declined", count: counts.declined },
            { value: "expired", label: "Expired", count: counts.expired },
          ] as const).map((option) => {
            const active = status === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setStatus(option.value)}
                className={[
                  "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition",
                  active
                    ? "border-[#285b3d] bg-[#285b3d] text-white shadow-sm"
                    : "border-[#e5e3da] bg-white text-[#526055] hover:border-[#bdcdbb] hover:bg-[#f4f6f0]",
                ].join(" ")}
              >
                {option.label}
                <span
                  className={[
                    "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    active
                      ? "bg-white/15 text-white"
                      : "bg-[#edf0e8] text-[#617064]",
                  ].join(" ")}
                >
                  {option.count}
                </span>
              </button>
            );
          })}
        </section>

        {/* Feedback */}
        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-[#f0d3ce] bg-[#fff0ed] px-4 py-3 text-sm text-[#9a3d32]">
            We couldn't load or update your invitations: {error}
          </div>
        )}

        {feedback && (
          <div role="status" className="mt-4 rounded-xl border border-[#d9e8d3] bg-[#edf4e8] px-4 py-3 text-sm text-[#315d3c]">
            {feedback}
          </div>
        )}

        {/* Invitation cards */}
        <section className="mt-5 max-h-[min(68vh,760px)] min-h-0 space-y-4 overflow-y-auto overscroll-contain pr-2 pb-1 [scrollbar-gutter:stable]">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <OpportunityCard
                key={item.invitation_id}
                item={item}
                busy={busyId === item.invitation_id}
                onRespond={respond}
              />
            ))
          ) : (
            <div className="rounded-[20px] border border-dashed border-[#dcded3] bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf0e2] text-[#07552f]">
                <Icon name="briefcase" size={30} />
              </div>
              <h2 className="mt-4 font-serif text-[23px] font-bold text-[#17251c]">
                {opportunities.length === 0
                  ? "No opportunities yet"
                  : "No matching opportunities"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[#758176]">
                {opportunities.length === 0
                  ? "When Apronly sends you an invitation, you can review the role and respond here."
                  : "Try changing your search or filters to see more invitations."}
              </p>
              {(search || city !== "all" || role !== "all" || status !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCity("all");
                    setRole("all");
                    setStatus("all");
                  }}
                  className="mt-5 text-sm font-bold text-[#07552f] underline underline-offset-4"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </section>

        <footer className="mt-9 border-t border-[#e8e3d8] py-5 text-center text-[11px] text-[#8a9388]">
          Apronly · Hospitality careers, thoughtfully connected.
        </footer>
      </div>
    </main>
  );
}