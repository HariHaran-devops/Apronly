import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import CandidateOpportunities, {
  type CandidateOpportunity,
} from "./candidate-opportunities";
import CandidateWorkspaceShell from "./candidate-workspace-shell";

export default function CandidateDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#fbf9f3] px-5">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#dce5d8] border-t-[#386246]" />
            <p className="mt-4 text-sm text-[#64756a]">
              Loading your Apronly workspace...
            </p>
          </div>
        </main>
      }
    >
      <CandidateDashboardContent />
    </Suspense>
  );
}

async function CandidateDashboardContent() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  const fullName =
    user.user_metadata?.full_name?.toString().trim() || "Candidate";

  // Verify the user's role.
  const { data: roleRecords, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) {
    console.log(
      "[APRONLY_ROLE_DEBUG]",
      JSON.stringify({
        userId: user.id,
        code: roleError.code,
        message: roleError.message,
        details: roleError.details,
        hint: roleError.hint,
      }),
    );

    return (
      <CandidateWorkspaceShell fullName={fullName}>
        <main className="flex min-h-[75vh] items-center justify-center px-5 py-10">
          <section className="w-full max-w-md rounded-2xl border border-[#e8e3d8] bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#829080]">
              Account access
            </p>
            <h1 className="mt-3 font-serif text-2xl font-bold text-[#263b2e]">
              Unable to verify your account
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#68746c]">
              We couldn&apos;t verify your account permissions. Please try again.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#07552f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#064326]"
            >
              Return home
            </Link>
          </section>
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

  // Load candidate profile.
  const { data: profile, error: profileError } = await supabase
    .from("candidate_profiles")
    .select(
      "city, preferred_cities, skills, experience_years, current_position, employment_status, bio",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.log(
      "[APRONLY_PROFILE_DEBUG]",
      JSON.stringify({
        userId: user.id,
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      }),
    );

    return (
      <CandidateWorkspaceShell fullName={fullName}>
        <main className="flex min-h-[75vh] items-center justify-center px-5 py-10">
          <section className="w-full max-w-md rounded-2xl border border-[#e8e3d8] bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#829080]">
              Candidate profile
            </p>
            <h1 className="mt-3 font-serif text-2xl font-bold text-[#263b2e]">
              Unable to load your profile
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#68746c]">
              Your account is verified, but we couldn&apos;t retrieve your
              candidate profile. Please try again later.
            </p>
          </section>
        </main>
      </CandidateWorkspaceShell>
    );
  }

  if (!profile) redirect("/onboarding/candidate");

  // Load opportunities through the existing privacy-preserving RPC.
  const { data: opportunityData, error: opportunityError } =
    await supabase.rpc("get_my_candidate_opportunities");

  if (opportunityError) {
    console.log(
      "[APRONLY_OPPORTUNITIES_DEBUG]",
      JSON.stringify({
        userId: user.id,
        code: opportunityError.code,
        message: opportunityError.message,
        details: opportunityError.details,
        hint: opportunityError.hint,
      }),
    );
  }

  const opportunities = (opportunityData ?? []) as CandidateOpportunity[];
  const skills = profile.skills ?? [];
  const preferredCities = profile.preferred_cities ?? [];

  const pendingCount = opportunities.filter((item) => {
    const status = (item.invitation_status || "pending").toLowerCase();
    return status === "pending" || status === "invited";
  }).length;

  const acceptedCount = opportunities.filter(
    (item) => item.invitation_status?.toLowerCase() === "accepted",
  ).length;

  const activeCount = pendingCount + acceptedCount;

  return (
    <CandidateWorkspaceShell
      fullName={fullName}
      opportunityCount={opportunities.length}
    >
      <main className="min-h-screen bg-[#fbf9f3] text-[#17251c]">
        <div className="mx-auto w-full max-w-[1600px] px-5 pb-8 sm:px-7 lg:px-[38px]">
          {/* Hero */}
          <section className="relative -mx-5 min-h-[170px] overflow-hidden border-b border-[#e9e3d8] bg-[#f8f5ec] px-5 py-5 sm:-mx-7 sm:px-7 lg:-mx-[38px] lg:px-[40px]">
            {/* Restaurant photograph */}
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/images/sidebar-landscape.jpg')",
              }}
            />

            {/* Text readability overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#fbf9f3] via-[#fbf9f3]/90 to-[#fbf9f3]/10" />

            <div className="relative z-10 max-w-[610px] pt-1">
              <p className="text-[13px] font-bold tracking-[0.22em] text-[#155b37]">
                YOUR CAREER WORKSPACE
              </p>

              <h1 className="mt-2 font-serif text-[34px] font-bold leading-[1.12] tracking-[-1.1px] text-[#101710] sm:text-[40px]">
                Welcome, {fullName}
              </h1>

              <p className="mt-2 max-w-[540px] text-[15px] leading-[1.45] text-[#202820]">
                Manage your profile, track invitations and discover opportunities
                in the hospitality industry.
              </p>
            </div>
          </section>

          {/* Candidate summary and invitation statistics */}
          <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.04fr]">
            {/* Candidate identity */}
            <article className="relative flex min-h-[110px] items-center gap-4 overflow-hidden rounded-[15px] border border-[#e5e5d7] bg-[#edf1e5] px-4 py-4 sm:gap-5 sm:px-6">
              <div
                className="pointer-events-none absolute inset-0 opacity-50"
                style={{
                  background:
                    "linear-gradient(155deg, transparent 55%, rgba(177,203,167,.45) 55.2%, transparent 75%), linear-gradient(170deg, transparent 70%, rgba(177,203,167,.35) 70.2%, transparent 88%)",
                }}
              />

              <div className="relative flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full bg-[#07552f] text-[32px] font-semibold text-white">
                {fullName.trim().charAt(0).toUpperCase() || "C"}
              </div>

              <div className="relative min-w-0 flex-1 border-l border-[#d2d8ca] pl-4 sm:pl-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="font-serif text-[23px] font-bold leading-tight text-[#101710]">
                    {fullName}
                  </h2>
                  <span className="rounded-full bg-[#dfe9d5] px-3 py-1 text-[11px] font-semibold text-[#285337]">
                    Candidate
                  </span>
                </div>

                <p className="mt-1 text-[14px] font-semibold text-[#202820]">
                  {profile.current_position || "Hospitality professional"}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#27372d]">
                  <span className="inline-flex items-center gap-1.5">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#155b37"
                      strokeWidth="2"
                    >
                      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    {profile.city || "City not added"}
                  </span>

                  <span className="text-[#8b9387]">•</span>

                  <span className="inline-flex items-center gap-1.5">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#155b37"
                      strokeWidth="2"
                    >
                      <rect x="3" y="7" width="18" height="14" rx="2" />
                      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
                    </svg>
                    {profile.experience_years ?? 0} years experience
                  </span>
                </div>
              </div>

              <Link
                href="/onboarding/candidate"
                className="relative hidden shrink-0 items-center gap-2 rounded-lg border border-[#91ad91] bg-white/60 px-3 py-2 text-[12px] font-semibold text-[#244b31] transition hover:bg-white sm:inline-flex"
              >
                <span aria-hidden="true">✎</span>
                Edit Profile
              </Link>
            </article>

            {/* Invitation statistics */}
            <article className="grid min-h-[110px] grid-cols-3 rounded-[15px] border border-[#e5dfd5] bg-white/65 px-2 py-3 shadow-[0_1px_3px_rgba(35,45,30,0.04)] sm:px-3">
              {[
                {
                  label: "Active Invitations",
                  value: activeCount,
                  icon: "briefcase",
                },
                {
                  label: "Accepted",
                  value: acceptedCount,
                  icon: "check",
                },
                {
                  label: "Pending Response",
                  value: pendingCount,
                  icon: "clock",
                },
              ].map((stat, index) => (
                <div
                  key={stat.label}
                  className={`flex items-center justify-center gap-2 px-1 sm:gap-3 ${
                    index > 0 ? "border-l border-[#e5dfd5]" : ""
                  }`}
                >
                  <div className="hidden text-[#155b37] sm:block">
                    {stat.icon === "briefcase" && (
                      <svg
                        width="35"
                        height="35"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      >
                        <rect x="3" y="7" width="18" height="14" rx="2" />
                        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
                      </svg>
                    )}
                    {stat.icon === "check" && (
                      <svg
                        width="35"
                        height="35"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="m7 12 3 3 7-7" />
                      </svg>
                    )}
                    {stat.icon === "clock" && (
                      <svg
                        width="35"
                        height="35"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                    )}
                  </div>

                  <div className="text-center sm:text-left">
                    <p className="font-serif text-[27px] font-bold leading-none text-[#101710]">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-[11px] leading-tight text-[#202820] sm:text-[13px]">
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </article>
          </section>

          {/* About, work preferences and skills */}
          <section
            id="profile"
            className="mt-4 grid scroll-mt-20 gap-4 md:grid-cols-3"
          >
            {/* About */}
            <article className="min-h-[132px] rounded-[15px] border border-[#e6e0d7] bg-white/45 px-5 py-4 sm:px-6">
              <div className="flex items-start gap-4">
                <svg
                  className="mt-0.5 shrink-0 text-[#155b37]"
                  width="27"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M8 13h8M8 17h8" />
                </svg>

                <div className="min-w-0">
                  <h2 className="font-serif text-[19px] font-bold text-[#151c16]">
                    About you
                  </h2>
                  <p className="mt-1 text-[13px] leading-[1.55] text-[#202820]">
                    {profile.bio ||
                      "Add a short introduction about your hospitality experience and strengths."}
                  </p>
                </div>
              </div>
            </article>

            {/* Preferences */}
            <article
              id="preferences"
              className="min-h-[132px] scroll-mt-20 rounded-[15px] border border-[#e6e0d7] bg-white/45 px-5 py-4 sm:px-6"
            >
              <div className="flex items-start gap-4">
                <svg
                  className="mt-0.5 shrink-0 text-[#155b37]"
                  width="27"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>

                <div className="min-w-0">
                  <h2 className="font-serif text-[19px] font-bold text-[#151c16]">
                    Work preferences
                  </h2>
                  <p className="mt-0.5 text-[12px] text-[#202820]">
                    Preferred cities for opportunities
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {preferredCities.length > 0 ? (
                      preferredCities.map((city: string) => (
                        <span
                          key={city}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf0e3] px-3 py-1.5 text-[11px] font-semibold text-[#294a33]"
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                          {city}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#778176]">
                        No preferred cities added
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </article>

            {/* Skills */}
            <article className="min-h-[132px] rounded-[15px] border border-[#e6e0d7] bg-white/45 px-5 py-4 sm:px-6">
              <div className="flex items-start gap-4">
                <svg
                  className="mt-0.5 shrink-0 text-[#155b37]"
                  width="27"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="m12 2 9 5-9 5-9-5 9-5Z" />
                  <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
                </svg>

                <div className="min-w-0">
                  <h2 className="font-serif text-[19px] font-bold text-[#151c16]">
                    Skills
                  </h2>
                  <p className="mt-0.5 text-[12px] text-[#202820]">
                    Your key skills and areas of expertise
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {skills.length > 0 ? (
                      skills.map((skill: string) => (
                        <span
                          key={skill}
                          className="rounded-full bg-[#eaf0e3] px-3 py-1.5 text-[11px] font-semibold text-[#294a33]"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#778176]">
                        Add skills to your profile
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </section>

          {/* Opportunities */}
          <section
            id="opportunities"
            className="mt-4 scroll-mt-20"
          >
            <div className="mb-3 flex items-center gap-4">
              <svg
                className="shrink-0 text-[#155b37]"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <rect x="3" y="7" width="18" height="14" rx="2" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
              </svg>

              <div>
                <h2 className="font-serif text-[29px] font-bold leading-tight tracking-[-.7px] text-[#101710]">
                  Your opportunities
                </h2>
                <p className="mt-0.5 text-[14px] text-[#202820]">
                  Invitations from verified restaurants that match your profile and preferences.
                </p>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="mb-4 flex items-center gap-3 rounded-[13px] bg-[#edf1e5] px-4 py-2.5 sm:px-5">
              <svg
                className="shrink-0 text-[#155b37]"
                width="25"
                height="27"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 2 3 6v6c0 5 4 8 9 10 5-2 9-5 9-10V6l-9-4Z" />
                <path d="m8 12 3 3 5-6" />
              </svg>

              <p className="text-[12px] leading-[1.5] text-[#202820] sm:text-[13px]">
                <strong className="mr-1">Your privacy matters:</strong>
                Employer identity and recruiter details remain private until you provide consent and the platform completes the disclosure process.
              </p>
            </div>

            <CandidateOpportunities
              initialOpportunities={opportunities}
              loadError={opportunityError?.message ?? null}
            />
          </section>

          <footer
            id="help"
            className="mt-8 border-t border-[#e8e3d8] py-5 text-center text-[11px] text-[#8a9388]"
          >
            Apronly · Hospitality careers, thoughtfully connected.
          </footer>
        </div>
      </main>
    </CandidateWorkspaceShell>
  );
}