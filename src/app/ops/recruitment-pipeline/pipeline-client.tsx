
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type PipelineRecord = {
  id: string;
  matchId: string;
  stage: string;
  internalNotes: string;
  consentObtainedAt: string | null;
  consentMethod: string | null;
  consentScope: string | null;
  createdAt: string;
  updatedAt: string;
  candidateName: string;
  candidatePosition: string;
  candidateCity: string;
  candidateExperience: number | null;
  vacancyTitle: string;
  department: string;
  hiringCity: string;
  restaurantName: string;
  matchStatus: string;
};

const STAGES = [
  { value: "invitation_accepted", label: "Invitation accepted" },
  { value: "candidate_contacted", label: "Candidate contacted" },
  { value: "candidate_interested", label: "Candidate interested" },
  { value: "consent_obtained", label: "Consent obtained" },
  { value: "introduced_to_restaurant", label: "Introduced to restaurant" },
  { value: "interview_in_progress", label: "Interview in progress" },
  { value: "selected", label: "Selected" },
  { value: "rejected", label: "Rejected" },
  { value: "joined", label: "Joined" },
  { value: "placement_completed", label: "Placement completed" },
  { value: "closed", label: "Closed" },
] as const;

const ACTIVE_STAGES = [
  "invitation_accepted",
  "candidate_contacted",
  "candidate_interested",
  "consent_obtained",
  "introduced_to_restaurant",
  "interview_in_progress",
  "selected",
  "joined",
];

function formatDate(value: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStageLabel(value: string) {
  return STAGES.find((stage) => stage.value === value)?.label ?? value;
}

function getStageStyle(value: string) {
  switch (value) {
    case "invitation_accepted":
      return "bg-[#e9eee7] text-[#49634d]";
    case "candidate_contacted":
      return "bg-[#f1eadb] text-[#826c40]";
    case "candidate_interested":
      return "bg-[#e8eee9] text-[#456b55]";
    case "consent_obtained":
      return "bg-[#e5eee7] text-[#365f45]";
    case "introduced_to_restaurant":
      return "bg-[#e8ebef] text-[#536578]";
    case "interview_in_progress":
      return "bg-[#eee8f1] text-[#735d83]";
    case "selected":
    case "joined":
    case "placement_completed":
      return "bg-[#e2eee5] text-[#356647]";
    case "rejected":
    case "closed":
      return "bg-[#f4e8e5] text-[#986052]";
    default:
      return "bg-[#f1eee7] text-[#756f62]";
  }
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: "users" | "activity" | "shield" | "award" | "search" | "arrow" | "check" | "clock";
  className?: string;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const paths = {
    users: (
      <>
        <path {...common} d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle {...common} cx="10" cy="7" r="4" />
        <path {...common} d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    activity: (
      <>
        <path {...common} d="M3 12h4l3-8 4 16 3-8h4" />
      </>
    ),
    shield: (
      <>
        <path {...common} d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path {...common} d="m9 12 2 2 4-4" />
      </>
    ),
    award: (
      <>
        <circle {...common} cx="12" cy="8" r="6" />
        <path {...common} d="m8.2 13-1 9 4.8-3 4.8 3-1-9" />
      </>
    ),
    search: (
      <>
        <circle {...common} cx="11" cy="11" r="7" />
        <path {...common} d="m20 20-4-4" />
      </>
    ),
    arrow: <path {...common} d="M5 12h14m-6-6 6 6-6 6" />,
    check: <path {...common} d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle {...common} cx="12" cy="12" r="9" />
        <path {...common} d="M12 7v5l3 2" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: "users" | "activity" | "shield" | "award";
}) {
  return (
    <div className="rounded-2xl border border-[#e9e3d8] bg-white p-5 shadow-[0_2px_12px_rgba(45,48,39,0.025)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-[#827e73]">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1f1e9] text-[#52664e]">
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-4 font-serif text-4xl leading-none text-[#252a23]">
        {value}
      </p>
      <p className="mt-3 text-xs text-[#969185]">{description}</p>
    </div>
  );
}

export default function PipelineClient({
  initialRecords,
}: {
  initialRecords: PipelineRecord[];
}) {
  const router = useRouter();

  const [records, setRecords] = useState(initialRecords);
  const [selectedId, setSelectedId] = useState(initialRecords[0]?.id ?? "");
  const [stage, setStage] = useState(initialRecords[0]?.stage ?? "");
  const [notes, setNotes] = useState(initialRecords[0]?.internalNotes ?? "");
  const [consentMethod, setConsentMethod] = useState("phone");
  const [consentScope, setConsentScope] = useState(
    "Permission to share the candidate's professional profile with the specified restaurant for this vacancy."
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setRecords(initialRecords);

    if (!initialRecords.length) {
      setSelectedId("");
      setStage("");
      setNotes("");
      return;
    }

    const refreshedSelection =
      initialRecords.find((item) => item.id === selectedId) ??
      initialRecords[0];

    setSelectedId(refreshedSelection.id);
    setStage(refreshedSelection.stage);
    setNotes(refreshedSelection.internalNotes);
  }, [initialRecords]);

  const selected = records.find((item) => item.id === selectedId);
  const effectiveStage = stage || selected?.stage || "";

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesStage = filter === "all" || record.stage === filter;

      const searchableText = [
        record.candidateName,
        record.candidatePosition,
        record.candidateCity,
        record.vacancyTitle,
        record.department,
        record.restaurantName,
        record.hiringCity,
      ]
        .join(" ")
        .toLowerCase();

      return matchesStage && (!query || searchableText.includes(query));
    });
  }, [records, filter, search]);

  const counts = useMemo(
    () => ({
      total: records.length,
      active: records.filter((item) => ACTIVE_STAGES.includes(item.stage as (typeof ACTIVE_STAGES)[number])).length,
      consent: records.filter((item) => item.consentObtainedAt).length,
      completed: records.filter((item) => item.stage === "placement_completed").length,
    }),
    [records]
  );

  const stageCounts = useMemo(
    () =>
      STAGES.map((item) => ({
        ...item,
        count: records.filter((record) => record.stage === item.value).length,
      })).filter((item) => item.count > 0),
    [records]
  );

  function selectRecord(record: PipelineRecord) {
    setSelectedId(record.id);
    setStage(record.stage);
    setNotes(record.internalNotes);
    setFeedback(null);
    setConsentMethod(record.consentMethod || "phone");
    setConsentScope(
      record.consentScope ||
        "Permission to share the candidate's professional profile with the specified restaurant for this vacancy."
    );
  }

  async function saveChanges() {
    if (!selected) return;

    if (effectiveStage === "consent_obtained") {
      if (!consentMethod.trim() || !consentScope.trim()) {
        setFeedback({
          type: "error",
          message: "Enter the consent method and permission scope.",
        });
        return;
      }
    }

    const requiresConsent = [
      "introduced_to_restaurant",
      "interview_in_progress",
      "selected",
      "joined",
      "placement_completed",
    ].includes(effectiveStage);

    if (requiresConsent && !selected.consentObtainedAt) {
      setFeedback({
        type: "error",
        message:
          "Record the candidate's explicit consent before proceeding.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc(
        "admin_update_recruitment_pipeline",
        {
          p_match_id: selected.matchId,
          p_stage: effectiveStage,
          p_internal_notes: notes.trim() || null,
          p_consent_method:
            effectiveStage === "consent_obtained" ? consentMethod : null,
          p_consent_scope:
            effectiveStage === "consent_obtained"
              ? consentScope.trim()
              : null,
        }
      );

      if (error) throw error;

      setFeedback({
        type: "success",
        message: "Recruitment progress saved successfully.",
      });

      router.refresh();
    } catch (error: unknown) {
      console.error("Recruitment pipeline update failed:", error);

      const dbError = error as {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };

      const errorMessage = [
        dbError?.message,
        dbError?.details,
        dbError?.hint,
        dbError?.code ? `Error code: ${dbError.code}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      setFeedback({
        type: "error",
        message: errorMessage || "Unable to update recruitment progress.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 space-y-7 font-sans">
      {/* Dashboard metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total accepted"
          value={counts.total}
          description="Accepted candidate invitations"
          icon="users"
        />
        <MetricCard
          label="Active recruitment"
          value={counts.active}
          description="Candidates currently progressing"
          icon="activity"
        />
        <MetricCard
          label="Consent recorded"
          value={counts.consent}
          description="Candidates who authorised disclosure"
          icon="shield"
        />
        <MetricCard
          label="Placements completed"
          value={counts.completed}
          description="Successfully completed placements"
          icon="award"
        />
      </div>

      {/* Stage distribution */}
      <section className="rounded-2xl border border-[#e9e3d8] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c907e]">
              Recruitment overview
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[#252a23]">
              Pipeline distribution
            </h2>
          </div>
          <p className="text-xs text-[#969185]">
            {records.length} total recruitment records
          </p>
        </div>

        {records.length === 0 ? (
          <p className="mt-5 rounded-xl bg-[#f6f4ee] p-5 text-sm text-[#827e73]">
            Accepted invitations will appear here automatically.
          </p>
        ) : (
          <div className="mt-6 flex flex-wrap gap-2">
            {stageCounts.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  filter === item.value
                    ? "border-[#65775c] bg-[#edf0e9]"
                    : "border-[#ece7dc] bg-[#faf9f6] hover:bg-[#f1f0e9]"
                }`}
              >
                <span className="block text-lg font-semibold tabular-nums text-[#30372e]">
                  {item.count}
                </span>
                <span className="mt-0.5 block text-[11px] text-[#827e73]">
                  {item.label}
                </span>
              </button>
            ))}
            {filter !== "all" && (
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="self-center px-3 py-2 text-xs font-medium text-[#65775c] underline underline-offset-4"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </section>

      {/* Main workspace */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.45fr)]">
        {/* Candidate queue */}
        <section className="min-w-0 flex h-[760px] flex-col overflow-hidden rounded-2xl border border-[#e9e3d8] bg-white">
          <div className="border-b border-[#eee9df] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c907e]">
                  Candidate workspace
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[#252a23]">
                  Accepted candidates
                </h2>
                <p className="mt-1 text-xs text-[#969185]">
                  {filteredRecords.length} of {records.length} records
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f1e9] text-[#52664e]">
                <Icon name="users" />
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#999487]">
                  <Icon name="search" className="h-4 w-4" />
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search candidate, role or vacancy..."
                  className="w-full rounded-xl border border-[#e9e3d8] bg-[#faf9f6] py-3 pl-10 pr-3 text-sm text-[#30372e] outline-none transition placeholder:text-[#a39e92] focus:border-[#819075] focus:ring-2 focus:ring-[#819075]/10"
                />
              </div>

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="w-full rounded-xl border border-[#e9e3d8] bg-[#faf9f6] px-3 py-3 text-sm text-[#55594f] outline-none focus:border-[#819075]"
              >
                <option value="all">All recruitment stages</option>
                {STAGES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
            {filteredRecords.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e5dfd3] px-5 py-12 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f1e9] text-[#65775c]">
                  <Icon name="search" className="h-5 w-5" />
                </span>
                <p className="mt-4 text-sm font-medium text-[#45483f]">
                  No matching candidates
                </p>
                <p className="mt-1 text-xs leading-5 text-[#969185]">
                  Try another name, vacancy or recruitment stage.
                </p>
              </div>
            ) : (
              filteredRecords.map((record) => {
                const active = record.id === selectedId;

                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => selectRecord(record)}
                    aria-pressed={active}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      active
                        ? "border-[#73856b] bg-[#f0f2eb] shadow-[0_2px_10px_rgba(54,68,49,0.06)]"
                        : "border-transparent bg-[#faf9f6] hover:border-[#e8e3d8] hover:bg-[#f5f3ed]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e9e9df] font-serif text-lg text-[#52664e]">
                        {record.candidateName.trim().charAt(0).toUpperCase() || "C"}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-[#30372e]">
                            {record.candidateName}
                          </p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${getStageStyle(record.stage)}`}
                          >
                            {getStageLabel(record.stage)}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-[#827e73]">
                          {record.candidatePosition || "Position not specified"}
                          {record.candidateExperience !== null
                            ? ` · ${record.candidateExperience} years`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-[#e9e4d9] pt-3">
                      <p className="text-sm font-medium text-[#464a40]">
                        {record.vacancyTitle}
                      </p>
                      <p className="mt-1 text-xs text-[#827e73]">
                        {record.restaurantName} · {record.hiringCity}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[#969185]">
                        Updated {formatDate(record.updatedAt)}
                      </span>
                      <span className="text-[#78846c]">
                        <Icon name="arrow" className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Recruitment record */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e9e3d8] bg-white">
          {!selected ? (
            <div className="flex min-h-[440px] flex-col items-center justify-center px-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f0f1e9] text-[#65775c]">
                <Icon name="users" className="h-6 w-6" />
              </span>
              <h2 className="mt-4 font-serif text-2xl text-[#30372e]">
                Select a candidate
              </h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-[#969185]">
                Choose a record from the candidate queue to manage recruitment progress.
              </p>
            </div>
          ) : (
            <>
              {/* Candidate identity */}
              <div className="border-b border-[#eee9df] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#8c907e]">
                      Recruitment record
                    </p>
                    <h2 className="mt-2 font-serif text-3xl text-[#252a23]">
                      {selected.candidateName}
                    </h2>
                    <p className="mt-1 text-sm text-[#827e73]">
                      {selected.candidatePosition || "Position not specified"}
                      {selected.candidateCity
                        ? ` · ${selected.candidateCity}`
                        : ""}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${getStageStyle(effectiveStage)}`}
                  >
                    {getStageLabel(effectiveStage)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#f7f6f1] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#969185]">
                      Experience
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#3d4338]">
                      {selected.candidateExperience !== null
                        ? `${selected.candidateExperience} years`
                        : "Not specified"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f7f6f1] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#969185]">
                      Candidate city
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-[#3d4338]">
                      {selected.candidateCity || "Not specified"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f7f6f1] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#969185]">
                      Match status
                    </p>
                    <p className="mt-1 text-sm font-semibold capitalize text-[#3d4338]">
                      {selected.matchStatus.replaceAll("_", " ")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-[#e9e3d8] bg-[#f8f6ef] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8c907e]">
                      Hiring requirement
                    </p>
                    <span className="text-[10px] text-[#969185]">
                      Vacancy details
                    </span>
                  </div>
                  <p className="mt-2 font-serif text-xl text-[#30372e]">
                    {selected.vacancyTitle}
                  </p>
                  <p className="mt-1 text-sm text-[#827e73]">
                    {selected.department} · {selected.restaurantName}
                  </p>
                  <p className="mt-1 text-xs text-[#969185]">
                    Hiring location: {selected.hiringCity}
                  </p>
                </div>
              </div>

              {/* Recruitment controls */}
              <div className="space-y-6 p-5 sm:p-6">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8c907e]">
                        Workflow management
                      </p>
                      <h3 className="mt-1 font-serif text-xl text-[#30372e]">
                        Recruitment progression
                      </h3>
                    </div>
                    <Icon name="activity" className="h-5 w-5 text-[#78846c]" />
                  </div>

                  <label
                    htmlFor="pipeline-stage"
                    className="mb-2 block text-xs font-medium text-[#55594f]"
                  >
                    Current recruitment stage
                  </label>
                  <select
                    id="pipeline-stage"
                    value={effectiveStage}
                    onChange={(event) => {
                      setStage(event.target.value);
                      setFeedback(null);
                    }}
                    className="w-full rounded-xl border border-[#e7e2d7] bg-[#faf9f6] px-4 py-3 text-sm text-[#45483f] outline-none transition focus:border-[#819075] focus:ring-2 focus:ring-[#819075]/10"
                  >
                    {STAGES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs leading-5 text-[#969185]">
                    Update the stage as your team progresses with the candidate.
                  </p>
                </div>

                {/* Consent recording */}
                {effectiveStage === "consent_obtained" && (
                  <div className="rounded-xl border border-[#dfe6d9] bg-[#f4f6f0] p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e5ebdf] text-[#52664e]">
                        <Icon name="shield" className="h-[18px] w-[18px]" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-[#354332]">
                          Record candidate consent
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-[#78816f]">
                          Only record this after the candidate has explicitly
                          agreed. This form records the admin&apos;s
                          confirmation; it does not obtain consent automatically.
                        </p>
                      </div>
                    </div>

                    <label className="mt-5 block">
                      <span className="mb-2 block text-xs font-medium text-[#55594f]">
                        How was consent obtained?
                      </span>
                      <select
                        value={consentMethod}
                        onChange={(event) => setConsentMethod(event.target.value)}
                        className="w-full rounded-xl border border-[#e2e4d9] bg-white px-3 py-3 text-sm text-[#45483f] outline-none focus:border-[#819075]"
                      >
                        <option value="phone">Phone call</option>
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="in_person">In person</option>
                        <option value="written">Other written confirmation</option>
                      </select>
                    </label>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-xs font-medium text-[#55594f]">
                        Permission scope
                      </span>
                      <textarea
                        value={consentScope}
                        onChange={(event) => setConsentScope(event.target.value)}
                        maxLength={1000}
                        rows={4}
                        className="w-full resize-y rounded-xl border border-[#e2e4d9] bg-white p-3 text-sm leading-6 text-[#45483f] outline-none focus:border-[#819075]"
                      />
                      <span className="mt-1 block text-right text-[10px] text-[#969185]">
                        {consentScope.length}/1000
                      </span>
                    </label>
                  </div>
                )}

                {/* Existing consent */}
                {selected.consentObtainedAt && (
                  <div className="rounded-xl border border-[#dfe6d9] bg-[#f4f6f0] p-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e3ebdf] text-[#456b4c]">
                        <Icon name="check" className="h-4 w-4" />
                      </span>
                      <p className="text-sm font-semibold text-[#354332]">
                        Candidate consent recorded
                      </p>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#87907d]">
                          Recorded on
                        </p>
                        <p className="mt-1 text-xs text-[#45483f]">
                          {formatDate(selected.consentObtainedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#87907d]">
                          Consent method
                        </p>
                        <p className="mt-1 text-xs capitalize text-[#45483f]">
                          {selected.consentMethod?.replaceAll("_", " ") ||
                            "Not specified"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-[#e0e6d9] pt-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#87907d]">
                        Permission scope
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#55594f]">
                        {selected.consentScope || "Not specified"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Internal notes */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="pipeline-notes"
                      className="text-sm font-semibold text-[#3e4339]"
                    >
                      Internal notes
                    </label>
                    <span className="text-[10px] text-[#969185]">
                      Private to operations
                    </span>
                  </div>
                  <textarea
                    id="pipeline-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    maxLength={5000}
                    rows={5}
                    placeholder="Record call outcomes, candidate preferences or coordination notes..."
                    className="w-full resize-y rounded-xl border border-[#e7e2d7] bg-[#faf9f6] p-4 text-sm leading-6 text-[#45483f] outline-none transition placeholder:text-[#aaa496] focus:border-[#819075] focus:ring-2 focus:ring-[#819075]/10"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-[10px] text-[#969185]">
                      Notes are for internal recruitment coordination.
                    </p>
                    <span className="text-[10px] tabular-nums text-[#969185]">
                      {notes.length}/5000
                    </span>
                  </div>
                </div>

                {/* Feedback */}
                {feedback && (
                  <div
                    role={feedback.type === "error" ? "alert" : "status"}
                    className={`rounded-xl border p-3 text-sm ${
                      feedback.type === "error"
                        ? "border-[#e8c9c1] bg-[#fbf1ee] text-[#965747]"
                        : "border-[#d7e5d6] bg-[#f0f6ef] text-[#426b48]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {feedback.type === "success" ? (
                        <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <Icon name="activity" className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      <span>{feedback.message}</span>
                    </div>
                  </div>
                )}

                {/* Save */}
                <button
                  type="button"
                  onClick={() => void saveChanges()}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#273329] px-5 py-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#394b3b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Saving changes...
                    </>
                  ) : (
                    <>
                      Save recruitment progress
                      <Icon name="arrow" className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="flex items-start gap-2 rounded-lg bg-[#f8f6ef] p-3">
                  <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-[#78846c]" />
                  <p className="text-[11px] leading-5 text-[#827e73]">
                    Candidate details remain internal. Do not share a profile
                    with a restaurant before explicit candidate consent.
                  </p>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
