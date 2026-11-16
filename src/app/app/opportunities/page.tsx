
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";
import CandidateWorkspaceShell from "../candidate-workspace-shell";
import OpportunitiesView from "./opportunities-view";

import type { CandidateOpportunity } from "../candidate-opportunities";

function OpportunitiesLoading() {
  return (
    <main className="min-h-[70vh] bg-[#fbf9f3] px-6 py-16">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-8 w-64 rounded-lg bg-[#e8e3d8]" />
        <div className="mt-4 h-4 w-96 max-w-full rounded bg-[#e8e3d8]" />

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 rounded-2xl border border-[#e8e3d8] bg-white"
            />
          ))}
        </div>

        <div className="mt-6 h-64 rounded-2xl border border-[#e8e3d8] bg-white" />
      </div>
    </main>
  );
}

async function OpportunitiesContent() {
  // Dynamic authentication and database access happen
  // inside the Suspense boundary.
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const fullName =
    user.user_metadata?.full_name?.toString().trim() || "Candidate";

  const { data: roleRecords, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) {
    return (
      <CandidateWorkspaceShell fullName={fullName}>
        <main className="min-h-[70vh] bg-[#fbf9f3] px-6 py-16">
          <div className="mx-auto max-w-xl rounded-2xl border border-[#e8e3d8] bg-white p-8">
            <h1 className="font-serif text-2xl font-bold text-[#263b2e]">
              Unable to verify your account
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#68746c]">
              We couldn't verify your account permissions. Please try again.
            </p>
          </div>
        </main>
      </CandidateWorkspaceShell>
    );
  }

  const roles = (roleRecords ?? []).map((record) => record.role);

  if (!roles.includes("candidate")) {
    if (roles.includes("admin")) redirect("/ops");
    if (roles.includes("restaurant_staff")) redirect("/partner");
    redirect("/auth/complete");
  }

  const { data: profile, error: profileError } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return (
      <CandidateWorkspaceShell fullName={fullName}>
        <main className="min-h-[70vh] bg-[#fbf9f3] px-6 py-16">
          <div className="mx-auto max-w-xl rounded-2xl border border-[#e8e3d8] bg-white p-8">
            <h1 className="font-serif text-2xl font-bold text-[#263b2e]">
              Unable to load your profile
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#68746c]">
              Please try again later.
            </p>
          </div>
        </main>
      </CandidateWorkspaceShell>
    );
  }

  if (!profile) {
    redirect("/onboarding/candidate");
  }

  const { data, error } = await supabase.rpc(
    "get_my_candidate_opportunities"
  );

  if (error) {
    console.error("[APRONLY_OPPORTUNITIES_PAGE]", {
      code: error.code,
      message: error.message,
    });
  }

  const opportunities = (data ?? []) as CandidateOpportunity[];

  return (
    <CandidateWorkspaceShell
      fullName={fullName}
      opportunityCount={opportunities.length}
    >
      <OpportunitiesView
        initialOpportunities={opportunities}
        loadError={error?.message ?? null}
      />
    </CandidateWorkspaceShell>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<OpportunitiesLoading />}>
      <OpportunitiesContent />
    </Suspense>
  );
}
