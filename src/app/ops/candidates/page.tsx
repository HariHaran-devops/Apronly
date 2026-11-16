
import Link from "next/link";
import { connection } from "next/server";
import { requireAnyRole } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import OperationsSidebar from "../_components/operations-sidebar";
import CandidateManagement from "../candidate-management";
import { type HiringRequest } from "../hiring-review";

export const instant = false;

async function CandidatesPageContent() {
  // Ensure request-time rendering before any dynamic values are evaluated.
  await connection();

  await requireAnyRole(["admin"]);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurant_hiring_requests")
    .select(
      "id, restaurant_id, created_by, title, department, openings, description, responsibilities, minimum_experience_years, maximum_experience_years, required_skills, employment_type, shift_type, minimum_salary, maximum_salary, salary_currency, salary_period, city, joining_timeline, status, created_at, review_note, reviewed_by, reviewed_at"
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(100);

  const approvedHiringRequests = (data ?? []) as HiringRequest[];

  return (
    <main className="min-h-screen bg-[#F8F6F0] text-[#1F2D25] lg:flex">
      <OperationsSidebar active="candidates" />

      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-[#E5E2D8] bg-[#FBFAF6] px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-2 text-sm text-[#606B62]">
            <Link href="/ops" className="transition hover:text-[#174C34]">
              Operations
            </Link>
            <span>/</span>
            <span className="font-medium text-[#34453A]">Candidates</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#174A35] font-serif text-sm text-white">
              A
            </span>
            <span className="text-sm font-medium text-[#34453A]">
              Admin
            </span>

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="ml-2 rounded-lg border border-[#DEDCD2] px-3 py-2 text-xs font-medium text-[#536156] transition hover:bg-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="border-b border-[#E8E5DC] px-6 py-10 sm:px-10 lg:px-12 lg:py-12">
          <p className="text-xs font-semibold tracking-[0.19em] text-[#24583B]">
            APRONLY · PEOPLE OPERATIONS
          </p>

          <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight text-[#1F2923] sm:text-5xl">
            Candidates
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#62675F] sm:text-base">
            Search the private candidate database, review professional
            profiles and identify suitable people for approved vacancies.
          </p>
        </section>

        <div className="min-w-0 px-5 py-8 sm:px-8 lg:px-10">
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700"
            >
              Unable to load approved vacancies: {error.message}
            </div>
          )}

          <CandidateManagement
            approvedHiringRequests={approvedHiringRequests}
            vacancyLoadError={error?.message ?? null}
          />

          <footer className="mt-10 border-t border-[#DEDCD1] px-2 py-5 text-xs text-[#777D74]">
            Apronly · Internal recruitment operations.
          </footer>
        </div>
      </div>
    </main>
  );
}

export default async function CandidatesPage() {
  return <CandidatesPageContent />;
}
