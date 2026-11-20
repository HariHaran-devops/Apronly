
"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { HiringRequest } from "./hiring-review";
import { createClient } from "@/lib/supabase/client";

type CandidateDocument = {
  id: string;
  document_type: string;
  original_file_name: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
};

type Candidate = {
  candidate_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  account_status: string;
  bio: string | null;
  city: string | null;
  preferred_cities: string[] | null;
  skills: string[] | null;
  experience_years: number;
  current_position: string | null;
  employment_status: string | null;
  job_preferences: Record<string, unknown> | null;
  languages: Array<Record<string, unknown>> | null;
  employment_history: Array<Record<string, unknown>> | null;
  documents: CandidateDocument[] | null;
  profile_created_at: string;
  profile_updated_at: string;
  total_count: number;
};

type CandidateDashboardStats = {
  total_candidate_registrations: number;
  recruitable_candidates: number;
  incomplete_profiles: number;
  approved_vacancies: number;
  pipeline_records: number;
};

const PAGE_SIZE = 20;

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
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
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <div className="mt-1 break-words text-[15px] font-semibold leading-6">
        {children}
      </div>
    </div>
  );
}

function formatLabel(key: string) {
  const labels: Record<string, string> = {
    preferred_roles: "Preferred roles",
    preferred_departments: "Preferred departments",
    employment_types: "Employment types",
    salary_min: "Minimum salary",
    salary_max: "Maximum salary",
    minimum_salary: "Minimum salary",
    maximum_salary: "Maximum salary",
    salary_currency: "Currency",
    salary_period: "Salary period",
    availability: "Availability",
    available_from: "Available from",
    notice_period_days: "Notice period",
    language: "Language",
    proficiency: "Proficiency",
    employer: "Employer",
    employer_name: "Employer",
    company_name: "Company",
    title: "Job title",
    job_title: "Job title",
    department: "Department",
    employment_type: "Employment type",
    city: "City",
    start_date: "Start date",
    end_date: "End date",
    responsibilities: "Responsibilities",
  };

  return labels[key] ??
    key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown, key = ""): string {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    if (key.toLowerCase().includes("salary")) {
      return new Intl.NumberFormat("en-IN").format(value);
    }

    return String(value);
  }

  if (typeof value === "string") {
    if (
      /(^|_)(start_date|end_date|available_from|created_at|updated_at)$/i.test(key)
    ) {
      return formatDate(value);
    }

    return value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return String(value);
}

function StructuredValue({
  value,
  fieldKey = "",
}: {
  value: unknown;
  fieldKey?: string;
}): ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted">Not specified</span>;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return <span>{formatValue(value, fieldKey)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted">Not specified</span>;
    }

    const isPrimitiveList = value.every(
      (item) =>
        item === null ||
        ["string", "number", "boolean"].includes(typeof item)
    );

    if (isPrimitiveList) {
      return (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <span
              key={`${fieldKey}-${index}`}
              className="rounded-full border border-border bg-background px-3 py-1 text-xs"
            >
              {formatValue(item)}
            </span>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div
            key={`${fieldKey}-${index}`}
            className="rounded-xl border border-border bg-background p-4"
          >
            <StructuredValue value={item} fieldKey={fieldKey} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);

    if (entries.length === 0) {
      return <span className="text-muted">Not specified</span>;
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {entries.map(([key, item]) => (
          <div key={key} className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              {formatLabel(key)}
            </p>
            <div className="mt-1 break-words text-[15px] font-semibold leading-6">
              <StructuredValue value={item} fieldKey={key} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-muted">Not available</span>;
}

function StructuredDetails({
  title,
  value,
  emptyMessage,
}: {
  title: string;
  value: unknown;
  emptyMessage: string;
}) {
  const isEmpty =
    value === null ||
    value === undefined ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value as Record<string, unknown>).length === 0);

  return (
    <div className="mt-6 border-t border-border pt-5">
      <h4 className="text-base font-bold">{title}</h4>
      {isEmpty ? (
        <p className="mt-2 text-[15px] font-semibold text-muted">{emptyMessage}</p>
      ) : (
        <div className="mt-3 rounded-xl border border-border bg-background p-4">
          <StructuredValue value={value} />
        </div>
      )}
    </div>
  );
}

type CandidateInvitation = {
  id: string;
  match_id: string;
  invitation_message: string | null;
  status: string;
  sent_at: string | null;
  expires_at: string | null;
  responded_at: string | null;
  candidate_vacancy_matches: {
    hiring_request_id: string;
    restaurant_hiring_requests: {
      title: string;
      department: string;
      city: string;
    };
  };
};

function CandidateInvitationHistory({
  candidateId,
  refreshToken,
}: {
  candidateId: string;
  refreshToken: number;
}) {
  const [invitations, setInvitations] = useState<CandidateInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadInvitations() {
      setLoading(true);
      setError("");

      try {
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("candidate_opportunity_invitations")
          .select(`
            id,
            match_id,
            invitation_message,
            status,
            sent_at,
            expires_at,
            responded_at,
            candidate_vacancy_matches!inner (
              hiring_request_id,
              restaurant_hiring_requests!inner (
                title,
                department,
                city
              )
            )
          `)
          .eq("candidate_id", candidateId)
          .order("sent_at", { ascending: false });

        if (queryError) throw queryError;

        if (active) {
          setInvitations((data ?? []) as unknown as CandidateInvitation[]);
        }
      } catch (err) {
        console.error("Candidate invitation history failed:", err);
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load invitation history."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInvitations();

    return () => {
      active = false;
    };
  }, [candidateId, refreshToken]);

  return (
    <section className="border-t border-border pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-bold">Invitation history</h4>
        <span className="text-[13px] font-semibold text-muted">
          {invitations.length} {invitations.length === 1 ? "invitation" : "invitations"}
        </span>
      </div>

      {loading ? (
        <p className="mt-3 text-[15px] font-semibold text-muted">Loading invitation history...</p>
      ) : error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>
      ) : invitations.length === 0 ? (
        <p className="mt-3 text-[15px] font-semibold text-muted">
          No invitations have been sent to this candidate yet.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {invitations.map((invitation) => {
            const vacancy = invitation.candidate_vacancy_matches
              ?.restaurant_hiring_requests;
            const isExpired =
              (invitation.status === "pending" || invitation.status === "invited") &&
              invitation.expires_at !== null &&
              new Date(invitation.expires_at).getTime() < Date.now();
            const displayStatus = isExpired ? "Expired" : invitation.status;

            return (
              <article
                key={invitation.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {vacancy?.title || "Vacancy no longer available"}
                    </p>
                    {vacancy && (
                      <p className="mt-1 text-[13px] font-semibold text-muted">
                        {vacancy.department} · {vacancy.city}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-3 py-1 text-[13px] font-semibold capitalize">
                    {displayStatus.replace(/_/g, " ")}
                  </span>
                </div>

                {invitation.invitation_message && (
                  <p className="mt-3 whitespace-pre-wrap text-[15px] font-semibold leading-6 text-muted">
                    {invitation.invitation_message}
                  </p>
                )}

                <div className="mt-3 grid gap-2 text-[13px] font-semibold text-muted sm:grid-cols-3">
                  <p>Sent: {formatDate(invitation.sent_at)}</p>
                  <p>Expires: {formatDate(invitation.expires_at)}</p>
                  <p>Responded: {formatDate(invitation.responded_at)}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CandidateListItem({
  candidate,
  selected,
  onSelect,
}: {
  candidate: Candidate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-xl border p-3 text-left transition ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-surface hover:bg-surface-muted"
      }`}
    >
      <div className="flex items-start gap-3">
        {candidate.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.avatar_url}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[15px] font-semibold text-primary">
            {candidate.full_name?.trim().charAt(0).toUpperCase() || "C"}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">
            {candidate.full_name || "Unnamed candidate"}
          </p>
          <p className="mt-1 truncate text-[13px] font-semibold text-muted">
            {candidate.current_position || "Position not specified"}
          </p>
          <p className="mt-1 text-[13px] font-semibold text-muted">
            {[candidate.city, `${candidate.experience_years} years`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {candidate.skills?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {candidate.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-background px-2 py-1 text-[13px] font-semibold text-muted"
            >
              {skill}
            </span>
          ))}
          {candidate.skills.length > 3 && (
            <span className="px-1 py-1 text-[13px] font-semibold text-muted">
              +{candidate.skills.length - 3}
            </span>
          )}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-muted">
          {candidate.employment_status || "Status not specified"}
        </span>
      </div>
    </button>
  );
}

function CandidateDetailPanel({
  candidate,
  invitationHistoryRefresh,
}: {
  candidate: Candidate;
  invitationHistoryRefresh: number;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-start gap-4">
          {candidate.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={candidate.avatar_url}
              alt=""
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
              {candidate.full_name?.trim().charAt(0).toUpperCase() || "C"}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold tracking-[-0.025em]">
              {candidate.full_name || "Unnamed candidate"}
            </h3>
            <p className="mt-1 text-[15px] font-semibold text-muted">
              {candidate.current_position || "Position not specified"}
              {candidate.city ? ` · ${candidate.city}` : ""}
            </p>
            <p className="mt-1 text-[13px] font-semibold text-muted">
              {candidate.experience_years} years of experience
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-[760px] space-y-6 overflow-y-auto p-5">
        <section>
          <h4 className="mb-4 font-semibold">
            Personal and professional details
          </h4>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Detail label="Email">{candidate.email}</Detail>
            <Detail label="Phone">
              {candidate.phone || "Not specified"}
            </Detail>
            <Detail label="Account status">{candidate.account_status}</Detail>
            <Detail label="Employment status">
              {candidate.employment_status || "Not specified"}
            </Detail>
            <Detail label="Current city">
              {candidate.city || "Not specified"}
            </Detail>
            <Detail label="Experience">
              {candidate.experience_years} years
            </Detail>
            <Detail label="Preferred cities">
              {candidate.preferred_cities?.length
                ? candidate.preferred_cities.join(", ")
                : "Not specified"}
            </Detail>
            <Detail label="Profile created">
              {formatDate(candidate.profile_created_at)}
            </Detail>
            <Detail label="Last updated">
              {formatDate(candidate.profile_updated_at)}
            </Detail>
          </div>
        </section>

        <section className="border-t border-border pt-5">
          <Detail label="Skills">
            {candidate.skills?.length ? (
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-border px-3 py-1 text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              "Not specified"
            )}
          </Detail>
        </section>

        {candidate.bio && (
          <section className="border-t border-border pt-5">
            <Detail label="Candidate summary">
              <p className="whitespace-pre-wrap">{candidate.bio}</p>
            </Detail>
          </section>
        )}

        <StructuredDetails
          title="Job preferences"
          value={candidate.job_preferences}
          emptyMessage="No job preferences recorded."
        />

        <StructuredDetails
          title="Languages"
          value={candidate.languages}
          emptyMessage="No languages recorded."
        />

        <StructuredDetails
          title="Employment history"
          value={candidate.employment_history}
          emptyMessage="No employment history recorded."
        />

        <section className="border-t border-border pt-5">
          <h4 className="text-base font-bold">Documents</h4>

          {candidate.documents?.length ? (
            <div className="mt-3 space-y-3">
              {candidate.documents.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
                >
                  <div className="min-w-0">
                    <p className="break-all text-[15px] font-semibold">
                      {document.original_file_name}
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-muted">
                      {document.document_type} · {document.mime_type} ·{" "}
                      {Math.round(document.file_size_bytes / 1024)} KB
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-muted">
                      Uploaded {formatDate(document.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[15px] font-semibold text-muted">
              No documents uploaded.
            </p>
          )}

          <p className="mt-3 text-[13px] font-semibold text-muted">
            Document previews and downloads require a separate authorized
            and audited access operation. No storage paths are exposed here.
          </p>
        </section>

        <CandidateInvitationHistory
          candidateId={candidate.candidate_id}
          refreshToken={invitationHistoryRefresh}
        />

        <section className="border-t border-border pt-5">
          <Detail label="Candidate reference">
            <span className="break-all font-mono text-xs">
              {candidate.candidate_id}
            </span>
          </Detail>
        </section>
      </div>
    </article>
  );
}

interface CandidateManagementProps {
  approvedHiringRequests: HiringRequest[];
  vacancyLoadError?: string | null;
}

export default function CandidateManagement({
  approvedHiringRequests,
  vacancyLoadError,
}: CandidateManagementProps) {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [skill, setSkill] = useState("");
  const [minimumExperience, setMinimumExperience] = useState("");
  const [maximumExperience, setMaximumExperience] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [preferredRole, setPreferredRole] = useState("");

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedHiringRequestId, setSelectedHiringRequestId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [invitationMessage, setInvitationMessage] = useState("");
  const [invitationExpiryDays, setInvitationExpiryDays] = useState("7");
  const [inviting, setInviting] = useState(false);
  const [invitationFeedback, setInvitationFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [invitationHistoryRefresh, setInvitationHistoryRefresh] = useState(0);

  const [dashboardStats, setDashboardStats] =
    useState<CandidateDashboardStats | null>(null);
  const [dashboardStatsLoading, setDashboardStatsLoading] = useState(true);
  const [dashboardStatsError, setDashboardStatsError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboardStats() {
      setDashboardStatsLoading(true);
      setDashboardStatsError("");

      try {
        const supabase = createClient();
        const { data, error: statsError } = await supabase.rpc(
          "admin_candidate_dashboard_stats"
        );

        if (statsError) throw statsError;

        const rows = (data ?? []) as CandidateDashboardStats[];

        if (active) {
          setDashboardStats(rows[0] ?? null);
        }
      } catch (err) {
        console.error("Candidate dashboard stats failed:", err);

        if (active) {
          setDashboardStatsError(
            err instanceof Error
              ? err.message
              : "Unable to load candidate dashboard statistics."
          );
        }
      } finally {
        if (active) setDashboardStatsLoading(false);
      }
    }

    void loadDashboardStats();

    return () => {
      active = false;
    };
  }, []);

  const searchCandidates = useCallback(
    async (pageNumber = 0) => {
      const min = minimumExperience.trim() === ""
        ? null
        : Number(minimumExperience);

      const max = maximumExperience.trim() === ""
        ? null
        : Number(maximumExperience);

      if (
        (min !== null && (!Number.isFinite(min) || min < 0)) ||
        (max !== null && (!Number.isFinite(max) || max < 0))
      ) {
        setError("Experience filters must be valid non-negative numbers.");
        return;
      }

      if (min !== null && max !== null && min > max) {
        setError("Minimum experience cannot exceed maximum experience.");
        return;
      }

      if (
        search.length > 150 ||
        city.length > 100 ||
        skill.length > 100 ||
        employmentStatus.length > 100 ||
        preferredRole.length > 150
      ) {
        setError("One or more search filters exceed the allowed length.");
        return;
      }

      setLoading(true);
      setError("");
      setHasSearched(true);

      try {
        const supabase = createClient();

        const { data, error: searchError } = await supabase.rpc(
          "admin_search_candidates",
          {
            p_search: search.trim() || null,
            p_city: city.trim() || null,
            p_skill: skill.trim() || null,
            p_min_experience: min,
            p_max_experience: max,
            p_employment_status: employmentStatus.trim() || null,
            p_preferred_role: preferredRole.trim() || null,
            p_limit: PAGE_SIZE,
            p_offset: pageNumber * PAGE_SIZE,
          }
        );

        if (searchError) throw searchError;

        const rows = (data ?? []) as unknown as Candidate[];

        if (rows.length === 0 && pageNumber > 0) {
          setCandidates([]);
          setTotalCount(0);
          setPage(0);
          setError(
            "No records were returned for this page. The results may have changed. Please search again."
          );
          return;
        }

        setCandidates(rows);
        setSelectedCandidateId(rows[0]?.candidate_id ?? null);
        setTotalCount(rows[0]?.total_count ?? 0);
        setPage(pageNumber);
      } catch (err) {
        console.error("Candidate search failed:", err);
        setCandidates([]);
        setTotalCount(0);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to search candidates. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      search,
      city,
      skill,
      minimumExperience,
      maximumExperience,
      employmentStatus,
      preferredRole,
    ]
  );

  const sendInvitation = async () => {
    if (!selectedCandidate) {
      setInvitationFeedback({
        type: "error",
        message: "Select a candidate first.",
      });
      return;
    }

    if (!selectedHiringRequestId) {
      setInvitationFeedback({
        type: "error",
        message: "Select an approved vacancy first.",
      });
      return;
    }

    const expiryDays = Number(invitationExpiryDays);

    if (![3, 7, 14, 30].includes(expiryDays)) {
      setInvitationFeedback({
        type: "error",
        message: "Choose a valid invitation expiry period.",
      });
      return;
    }

    const trimmedMessage = invitationMessage.trim();

    if (trimmedMessage.length > 2000) {
      setInvitationFeedback({
        type: "error",
        message: "The invitation message cannot exceed 2,000 characters.",
      });
      return;
    }

    setInviting(true);
    setInvitationFeedback(null);

    try {
      const supabase = createClient();
      const expiresAt = new Date(
        Date.now() + expiryDays * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data, error: inviteError } = await supabase.rpc(
        "admin_invite_candidate",
        {
          p_hiring_request_id: selectedHiringRequestId,
          p_candidate_id: selectedCandidate.candidate_id,
          p_invitation_message: trimmedMessage || null,
          p_expires_at: expiresAt,
        }
      );

      if (inviteError) throw inviteError;

      if (!data) {
        throw new Error("The invitation could not be created. Please try again.");
      }

      setInvitationFeedback({
        type: "success",
        message: `Invitation created for ${selectedCandidate.full_name}. The candidate can respond from their opportunities dashboard.`,
      });
      setInvitationMessage("");
      setInvitationExpiryDays("7");
      setInvitationHistoryRefresh((current) => current + 1);
    } catch (err) {
      console.error("Candidate invitation failed:", err);
      setInvitationFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Unable to create the invitation. Please try again.",
      });
    } finally {
      setInviting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCity("");
    setSkill("");
    setMinimumExperience("");
    setMaximumExperience("");
    setEmploymentStatus("");
    setPreferredRole("");
    setCandidates([]);
    setTotalCount(0);
    setPage(0);
    setError("");
    setHasSearched(false);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const selectedCandidate = candidates.find((candidate) => candidate.candidate_id === selectedCandidateId) ?? null;
  const selectedHiringRequest = approvedHiringRequests.find((request) => request.id === selectedHiringRequestId) ?? null;

  return (
    <section className="mt-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[15px] font-semibold text-sage">PEOPLE OPERATIONS</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]">
            Candidate management
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] font-semibold leading-6 text-muted">
            Search the private candidate database, review professional
            profiles and identify suitable people for approved vacancies.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface px-5 py-3">
          <p className="text-[13px] font-semibold text-muted">Matching candidates</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {totalCount}
          </p>
        </div>
      </div>

      <section className="mb-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Total registrations",
              value: dashboardStats?.total_candidate_registrations,
              detail: "Candidate sign-ups",
            },
            {
              label: "Recruitable candidates",
              value: dashboardStats?.recruitable_candidates,
              detail: "Active, complete profiles",
            },
            {
              label: "Incomplete profiles",
              value: dashboardStats?.incomplete_profiles,
              detail: "Candidate onboarding started",
            },
            {
              label: "Approved vacancies",
              value: dashboardStats?.approved_vacancies,
              detail: "Open for recruitment",
            },
            {
              label: "Pipeline records",
              value: dashboardStats?.pipeline_records,
              detail: "Existing vacancy matches",
            },
          ].map((stat) => (
            <article
              key={stat.label}
              className="min-w-0 rounded-2xl border border-border bg-surface p-4"
            >
              <p className="text-[13px] font-semibold text-muted">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] tabular-nums">
                {dashboardStatsLoading
                  ? "—"
                  : stat.value?.toLocaleString("en-IN") ?? "—"}
              </p>
              <p className="mt-1 text-xs font-medium text-muted">
                {stat.detail}
              </p>
            </article>
          ))}
        </div>

        {dashboardStatsError && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600"
          >
            Dashboard statistics could not be loaded: {dashboardStatsError}
          </p>
        )}
      </section>

      <section className="mb-6 rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-sage">
            MATCHING CONTEXT
          </p>
          <h3 className="mt-2 text-xl font-bold tracking-[-0.025em]">
            Select an approved vacancy
          </h3>
          <p className="mt-1 text-[15px] font-semibold text-muted">
            Choose the hiring requirement you are sourcing candidates for.
            Selection does not send invitations or release candidate details.
          </p>
        </div>

        {vacancyLoadError ? (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600"
          >
            Unable to load approved vacancies: {vacancyLoadError}
          </div>
        ) : approvedHiringRequests.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-5 text-[15px] font-semibold text-muted">
            No approved vacancies are currently available for matching.
          </div>
        ) : (
          <>
            <label className="mt-4 block">
              <span className="mb-2 block text-[15px] font-semibold">
                Approved vacancy
              </span>
              <select
                value={selectedHiringRequestId}
                onChange={(event) => {
                  setSelectedHiringRequestId(event.target.value);
                  setInvitationFeedback(null);
                }}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-sage"
              >
                <option value="">Choose a vacancy</option>
                {approvedHiringRequests.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.title} · {request.department} · {request.city}
                  </option>
                ))}
              </select>
            </label>

            {selectedHiringRequest && (
              <div className="mt-4 rounded-2xl bg-surface-muted p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">
                      {selectedHiringRequest.title}
                    </h4>
                    <p className="mt-1 text-[15px] font-semibold text-muted">
                      {selectedHiringRequest.department} · {selectedHiringRequest.city}
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-[13px] font-semibold">
                    Approved
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-[13px] font-semibold text-muted">Openings</p>
                    <p className="mt-1 font-medium">
                      {selectedHiringRequest.openings}
                    </p>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-muted">Experience</p>
                    <p className="mt-1 font-medium">
                      {selectedHiringRequest.minimum_experience_years ?? 0}
                      {selectedHiringRequest.maximum_experience_years !== null
                        ? `–${selectedHiringRequest.maximum_experience_years}`
                        : "+"} years
                    </p>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-muted">Employment</p>
                    <p className="mt-1 font-medium">
                      {selectedHiringRequest.employment_type.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
                {selectedHiringRequest.required_skills.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[13px] font-semibold text-muted">Required skills</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedHiringRequest.required_skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-border px-3 py-1 text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void searchCandidates(0);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="sm:col-span-2 lg:col-span-3">
              <span className="mb-2 block text-[15px] font-semibold">
                Search candidates
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                maxLength={150}
                placeholder="Name, email, phone, position or skill"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-sage"
              />
            </label>

            <label>
              <span className="mb-2 block text-[15px] font-semibold">City</span>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                maxLength={100}
                placeholder="e.g. Hyderabad"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-sage"
              />
            </label>

            <label>
              <span className="mb-2 block text-[15px] font-semibold">
                Specific skill
              </span>
              <input
                value={skill}
                onChange={(event) => setSkill(event.target.value)}
                maxLength={100}
                placeholder="e.g. Customer service"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-sage"
              />
            </label>

            <label>
              <span className="mb-2 block text-[15px] font-semibold">
                Preferred role
              </span>
              <input
                value={preferredRole}
                onChange={(event) => setPreferredRole(event.target.value)}
                maxLength={150}
                placeholder="e.g. Head chef"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-sage"
              />
            </label>

            <label>
              <span className="mb-2 block text-[15px] font-semibold">
                Minimum experience (years)
              </span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={minimumExperience}
                onChange={(event) => setMinimumExperience(event.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-sage"
              />
            </label>

            <label>
              <span className="mb-2 block text-[15px] font-semibold">
                Maximum experience (years)
              </span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={maximumExperience}
                onChange={(event) => setMaximumExperience(event.target.value)}
                placeholder="Any"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-sage"
              />
            </label>

            <label>
              <span className="mb-2 block text-[15px] font-semibold">
                Employment status
              </span>
              <input
                value={employmentStatus}
                onChange={(event) => setEmploymentStatus(event.target.value)}
                maxLength={100}
                placeholder="e.g. employed"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-sage"
              />
              <span className="mt-1 block text-[13px] font-semibold text-muted">
                Enter the candidate&apos;s recorded status.
              </span>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary px-5 py-3 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search candidates"}
            </button>

            <button
              type="button"
              onClick={clearFilters}
              disabled={loading}
              className="rounded-xl border border-border px-5 py-3 text-[15px] font-semibold transition hover:bg-surface-muted disabled:opacity-50"
            >
              Clear filters
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600"
        >
          {error}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="rounded-2xl border border-border bg-surface p-10 text-center">
            <p className="text-[15px] font-semibold text-muted">
              Searching the candidate database...
            </p>
          </div>
        ) : hasSearched && candidates.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <h3 className="font-semibold">No matching candidates</h3>
            <p className="mt-2 text-[15px] font-semibold text-muted">
              Try changing your search terms or filters.
            </p>
          </div>
        ) : candidates.length > 0 ? (
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(250px,0.85fr)_minmax(0,1.7fr)]">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="flex items-center justify-between gap-2 border-b border-border p-4">
                <div>
                  <h3 className="text-base font-bold">Candidates</h3>
                  <p className="mt-1 text-[13px] font-semibold text-muted">
                    {candidates.length} shown · {totalCount} total
                  </p>
                </div>
                <span className="text-[13px] font-semibold text-muted">
                  Page {page + 1}
                </span>
              </div>

              <div className="max-h-[680px] space-y-2 overflow-y-auto p-3">
                {candidates.map((candidate) => (
                  <CandidateListItem
                    key={candidate.candidate_id}
                    candidate={candidate}
                    selected={selectedCandidateId === candidate.candidate_id}
                    onSelect={() => {
                      setSelectedCandidateId(candidate.candidate_id);
                      setInvitationFeedback(null);
                    }}
                  />
                ))}
              </div>
            </section>

            <section className="min-w-0">
              {selectedCandidate ? (
                <>
                  <CandidateDetailPanel
                    candidate={selectedCandidate}
                    invitationHistoryRefresh={invitationHistoryRefresh}
                  />

                  <section className="mt-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.16em] text-sage">
                        RECRUITMENT ACTION
                      </p>
                      <h3 className="mt-2 text-xl font-bold tracking-[-0.025em]">
                        Invite candidate
                      </h3>
                      <p className="mt-1 text-[15px] font-semibold text-muted">
                        Create an invitation for {selectedCandidate.full_name} to
                        consider the selected approved vacancy.
                      </p>
                      {selectedHiringRequest && (
                        <p className="mt-2 text-[15px] font-semibold">
                          Vacancy: {selectedHiringRequest.title} ·{" "}
                          {selectedHiringRequest.city}
                        </p>
                      )}
                    </div>

                    <div className="mt-5">
                      <label className="block">
                        <span className="mb-2 block text-[15px] font-semibold">
                          Invitation message (optional)
                        </span>
                        <textarea
                          value={invitationMessage}
                          onChange={(event) =>
                            setInvitationMessage(event.target.value)
                          }
                          maxLength={2000}
                          rows={4}
                          disabled={inviting}
                          placeholder="Introduce the opportunity and share any relevant details..."
                          className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-sage disabled:opacity-60"
                        />
                        <span className="mt-1 block text-right text-[13px] font-semibold text-muted">
                          {invitationMessage.length}/2000
                        </span>
                      </label>
                    </div>

                    <div className="mt-4">
                      <label className="block">
                        <span className="mb-2 block text-[15px] font-semibold">
                          Invitation expires after
                        </span>
                        <select
                          value={invitationExpiryDays}
                          onChange={(event) =>
                            setInvitationExpiryDays(event.target.value)
                          }
                          disabled={inviting}
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-sage disabled:opacity-60"
                        >
                          <option value="3">3 days</option>
                          <option value="7">7 days</option>
                          <option value="14">14 days</option>
                          <option value="30">30 days</option>
                        </select>
                      </label>
                    </div>

                    {invitationFeedback && (
                      <div
                        role={invitationFeedback.type === "error" ? "alert" : "status"}
                        className={`mt-4 rounded-xl border p-3 text-sm ${
                          invitationFeedback.type === "success"
                            ? "border-green-500/30 bg-green-500/5 text-green-700"
                            : "border-red-500/30 bg-red-500/5 text-red-600"
                        }`}
                      >
                        {invitationFeedback.message}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => void sendInvitation()}
                      disabled={inviting || !selectedHiringRequestId}
                      className="mt-5 w-full rounded-xl bg-primary px-5 py-3 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {inviting ? "Creating invitation..." : "Create candidate invitation"}
                    </button>

                    {!selectedHiringRequestId && (
                      <p className="mt-2 text-[13px] font-semibold text-muted">
                        Select an approved vacancy above to enable invitations.
                      </p>
                    )}
                  </section>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
                  <p className="text-[15px] font-semibold text-muted">
                    Select a candidate to view their profile.
                  </p>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>

      {hasSearched && totalPages > 1 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[15px] font-semibold text-muted">
            Page {page + 1} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || page === 0}
              onClick={() => void searchCandidates(page - 1)}
              className="rounded-xl border border-border px-4 py-2 text-[15px] font-semibold disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={loading || page + 1 >= totalPages}
              onClick={() => void searchCandidates(page + 1)}
              className="rounded-xl border border-border px-4 py-2 text-[15px] font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
