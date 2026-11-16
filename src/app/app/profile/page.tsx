
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import CandidateWorkspaceShell from "../candidate-workspace-shell";
import CandidateProfileView from "./profile-view";

export default function CandidateProfilePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#fbf9f3]">
          <p className="text-sm text-[#64756a]">Loading your profile...</p>
        </main>
      }
    >
      <CandidateProfileContent />
    </Suspense>
  );
}

async function CandidateProfileContent() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  const { data: roleRecords, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const fullName =
    user.user_metadata?.full_name?.toString().trim() || "Candidate";

  if (roleError) {
    return (
      <CandidateWorkspaceShell fullName={fullName}>
        <main className="min-h-[70vh] bg-[#fbf9f3] px-5 py-12">
          <p className="mx-auto max-w-2xl rounded-xl border border-[#eadfd5] bg-white p-6 text-sm text-[#765d50]">
            We couldn&apos;t verify your account permissions. Please refresh
            and try again.
          </p>
        </main>
      </CandidateWorkspaceShell>
    );
  }

  const roles = (roleRecords ?? []).map((item) => item.role);

  if (!roles.includes("candidate")) {
    if (roles.includes("admin")) redirect("/ops");
    if (roles.includes("restaurant_staff")) redirect("/partner");
    redirect("/auth/complete");
  }

  const { data: profile, error: profileError } = await supabase
    .from("candidate_profiles")
    .select(
      "city, preferred_cities, skills, experience_years, current_position, employment_status, bio",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return (
      <CandidateWorkspaceShell fullName={fullName}>
        <main className="min-h-[70vh] bg-[#fbf9f3] px-5 py-12">
          <p className="mx-auto max-w-2xl rounded-xl border border-[#eadfd5] bg-white p-6 text-sm text-[#765d50]">
            We couldn&apos;t load your profile. Please try again later.
          </p>
        </main>
      </CandidateWorkspaceShell>
    );
  }

  if (!profile) redirect("/onboarding/candidate");

  const [
    { data: preferences },
    { data: languages },
    { data: employment },
    { data: resume },
  ] = await Promise.all([
    supabase
      .from("candidate_job_preferences")
      .select(
        "preferred_roles, preferred_departments, employment_types, minimum_salary, maximum_salary, salary_period, availability_status, available_from, notice_period_days",
      )
      .eq("candidate_id", user.id)
      .maybeSingle(),

    supabase
      .from("candidate_languages")
      .select("language, proficiency")
      .eq("candidate_id", user.id)
      .order("language", { ascending: true }),

    supabase
      .from("candidate_employment_history")
      .select(
        "employer_name, job_title, department, employment_type, city, start_date, end_date, is_current, responsibilities",
      )
      .eq("candidate_id", user.id)
      .order("start_date", { ascending: false }),

    supabase
      .from("candidate_documents")
      .select(
        "storage_path, original_file_name, mime_type, file_size_bytes",
      )
      .eq("candidate_id", user.id)
      .eq("document_type", "resume")
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <CandidateWorkspaceShell fullName={fullName}>
      <CandidateProfileView
        initialProfile={profile}
        initialPreferences={preferences}
        initialLanguages={languages ?? []}
        initialEmployment={employment ?? []}
        initialResume={resume}
        fullName={fullName}
      />
    </CandidateWorkspaceShell>
  );
}
