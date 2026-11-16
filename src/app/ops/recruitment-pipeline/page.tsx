
import Link from "next/link";
import { connection } from "next/server";
import { requireAnyRole } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import OperationsSidebar from "../_components/operations-sidebar";
import PipelineClient, { type PipelineRecord } from "./pipeline-client";

export const instant = false;

export default async function RecruitmentPipelinePage() {
  await connection();
  await requireAnyRole(["admin"]);

  const supabase = await createClient();

  const { data: pipelineRows, error: pipelineError } = await supabase
    .from("candidate_recruitment_pipeline")
    .select(
      "id, match_id, stage, internal_notes, consent_obtained_at, consent_obtained_by, consent_method, consent_scope, created_at, updated_at"
    )
    .order("updated_at", { ascending: false });

  if (pipelineError) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] font-sans lg:flex">
        <OperationsSidebar active="pipeline" />

        <main className="min-w-0 flex-1 px-5 py-10 sm:px-8">
          <div className="mx-auto max-w-5xl rounded-2xl border border-[#E8E1D6] bg-white p-6">
            <h1 className="font-serif text-2xl text-[#26372C]">
              Unable to load recruitment pipeline
            </h1>
            <p className="mt-3 text-sm text-[#858276]">
              {pipelineError.message}
            </p>
            <Link
              href="/ops"
              className="mt-5 inline-flex text-sm font-medium text-[#526B55] underline underline-offset-4"
            >
              Return to operations
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const rows = pipelineRows ?? [];
  const matchIds = [...new Set(rows.map((row) => row.match_id))];

  const { data: matches, error: matchError } =
    matchIds.length > 0
      ? await supabase
          .from("candidate_vacancy_matches")
          .select("id, candidate_id, hiring_request_id, status")
          .in("id", matchIds)
      : { data: [], error: null };

  if (matchError) {
    throw new Error(`Unable to load candidate matches: ${matchError.message}`);
  }

  const matchRecords = matches ?? [];

  const candidateIds = [
    ...new Set(matchRecords.map((match) => match.candidate_id)),
  ];

  const hiringRequestIds = [
    ...new Set(matchRecords.map((match) => match.hiring_request_id)),
  ];

  const [
    { data: candidateProfiles },
    { data: profiles },
    { data: hiringRequests },
  ] = await Promise.all([
    candidateIds.length
      ? supabase
          .from("candidate_profiles")
          .select("id, city, experience_years, current_position")
          .in("id", candidateIds)
      : Promise.resolve({ data: [] }),

    candidateIds.length
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", candidateIds)
      : Promise.resolve({ data: [] }),

    hiringRequestIds.length
      ? supabase
          .from("restaurant_hiring_requests")
          .select("id, restaurant_id, title, department, city")
          .in("id", hiringRequestIds)
      : Promise.resolve({ data: [] }),
  ]);

  const restaurantIds = [
    ...new Set(
      (hiringRequests ?? []).map((request) => request.restaurant_id)
    ),
  ];

  const { data: restaurants } =
    restaurantIds.length > 0
      ? await supabase
          .from("restaurants")
          .select("id, name")
          .in("id", restaurantIds)
      : { data: [] };

  const matchMap = new Map(
    matchRecords.map((item) => [item.id, item])
  );

  const candidateMap = new Map(
    (candidateProfiles ?? []).map((item) => [item.id, item])
  );

  const profileMap = new Map(
    (profiles ?? []).map((item) => [item.id, item])
  );

  const hiringMap = new Map(
    (hiringRequests ?? []).map((item) => [item.id, item])
  );

  const restaurantMap = new Map(
    (restaurants ?? []).map((item) => [item.id, item])
  );

  const records: PipelineRecord[] = rows.flatMap((row) => {
    const match = matchMap.get(row.match_id);

    if (!match) return [];

    const candidate = candidateMap.get(match.candidate_id);
    const profile = profileMap.get(match.candidate_id);
    const vacancy = hiringMap.get(match.hiring_request_id);

    return [
      {
        id: row.id,
        matchId: row.match_id,
        stage: row.stage,
        internalNotes: row.internal_notes ?? "",
        consentObtainedAt: row.consent_obtained_at,
        consentMethod: row.consent_method,
        consentScope: row.consent_scope,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        candidateName: profile?.full_name ?? "Candidate",
        candidatePosition: candidate?.current_position ?? "",
        candidateCity: candidate?.city ?? "",
        candidateExperience: candidate?.experience_years,
        vacancyTitle: vacancy?.title ?? "Vacancy",
        department: vacancy?.department ?? "",
        hiringCity: vacancy?.city ?? "",
        restaurantName: vacancy
          ? restaurantMap.get(vacancy.restaurant_id)?.name ?? "Restaurant"
          : "Restaurant",
        matchStatus: match.status,
      },
    ];
  });

  return (
    <div className="min-h-screen bg-[#F5F1E8] font-sans text-[#34372F] lg:flex">
      {/* Shared Operations navigation */}
      <OperationsSidebar active="pipeline" />

      {/* Main workspace */}
      <main className="min-h-screen min-w-0 flex-1 px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-[1500px]">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-[#E6DFD2] pb-6">
            <div>
              <Link
                href="/ops"
                className="inline-flex items-center gap-2 text-xs font-medium text-[#858276] transition hover:text-[#405642]"
              >
                <span aria-hidden="true">←</span>
                Operations
              </Link>

              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#71836A]">
                APRONLY · PEOPLE OPERATIONS
              </p>

              <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#26372C] sm:text-4xl">
                Recruitment pipeline
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#858276]">
                Track accepted invitations through candidate contact, consent,
                interviews and successful placements.
              </p>
            </div>

            <Link
              href="/ops"
              className="inline-flex min-h-10 items-center rounded-xl border border-[#E7E1D6] bg-white/70 px-4 py-2 text-xs font-medium text-[#50584C] transition hover:bg-white"
            >
              Back to dashboard
            </Link>
          </header>

          <PipelineClient initialRecords={records} />
        </div>
      </main>
    </div>
  );
}
