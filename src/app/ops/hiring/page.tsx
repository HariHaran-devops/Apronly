
import { connection } from "next/server";
import { requireAnyRole } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";

import OperationsSidebar from "../_components/operations-sidebar";
import HiringReview, { type HiringRequest } from "../hiring-review";

export const instant = false;

async function HiringPageContent() {
  await connection();
  await requireAnyRole(["admin"]);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurant_hiring_requests")
    .select(
      "id, restaurant_id, created_by, title, department, openings, description, responsibilities, minimum_experience_years, maximum_experience_years, required_skills, employment_type, shift_type, minimum_salary, maximum_salary, salary_currency, salary_period, city, joining_timeline, status, created_at, review_note, reviewed_by, reviewed_at"
    )
    .in("status", [
      "pending_review",
      "approved",
      "changes_requested",
      "rejected",
    ])
    .order("created_at", { ascending: false })
    .limit(100);

  const requests = (data ?? []) as HiringRequest[];

  const restaurantIds = [
    ...new Set(requests.map((request) => request.restaurant_id)),
  ];

  let restaurantNames: Record<string, string> = {};
  let primaryOutlets: Record<
    string,
    NonNullable<HiringRequest["primary_outlet"]>
  > = {};

  let restaurantLoadError: string | null = null;

  if (restaurantIds.length > 0 && !error) {
    const { data: restaurants, error: restaurantsError } = await supabase
      .from("restaurants")
      .select(`
        id,
        name,
        outlets:restaurant_outlets (
          id,
          name,
          city,
          address_line1,
          address_line2,
          landmark,
          state,
          postal_code,
          country,
          is_primary
        )
      `)
      .in("id", restaurantIds);

    if (restaurantsError) {
      restaurantLoadError = restaurantsError.message;
    } else {
      for (const restaurant of restaurants ?? []) {
        restaurantNames[restaurant.id] = restaurant.name;

        const outlets = restaurant.outlets ?? [];
        const primaryOutlet =
          outlets.find((outlet) => outlet.is_primary) ?? null;

        if (primaryOutlet) {
          primaryOutlets[restaurant.id] = primaryOutlet;
        }
      }
    }
  }

  const requestsWithRestaurant: HiringRequest[] = requests.map(
    (request) => ({
      ...request,
      restaurant_name:
        restaurantNames[request.restaurant_id] ??
        "Restaurant name unavailable",
      primary_outlet:
        primaryOutlets[request.restaurant_id] ?? null,
    })
  );

  const loadError = error?.message ?? restaurantLoadError;

  return (
    <main className="min-h-screen bg-[#F8F6F0] text-[#26352D] lg:flex">
      <OperationsSidebar active="hiring" />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-4 border-b border-[#E8E2D7] bg-[#F8F6F0]/95 px-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs font-medium text-[#7B8178]">
              Operations / People
            </p>
            <p className="mt-1 text-sm font-semibold text-[#26352D]">
              Hiring approvals
            </p>
          </div>

          <span className="rounded-full border border-[#DCE3D8] bg-[#EEF2EA] px-3 py-1.5 text-xs font-semibold text-[#526B50]">
            Administrator
          </span>
        </header>

        <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 lg:px-10">
          <section className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#71836A]">
              APRONLY · PEOPLE OPERATIONS
            </p>

            <h1 className="mt-3 font-serif text-4xl tracking-tight text-[#26352D] sm:text-5xl">
              Hiring approvals
            </h1>

            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#73786F]">
              Review hiring requests from verified restaurant partners,
              monitor their status and manage opportunities before they
              reach candidates.
            </p>
          </section>

          <HiringReview
            requests={requestsWithRestaurant}
            loadError={loadError}
          />

          <footer className="mt-12 border-t border-[#E8E2D7] py-6 text-xs text-[#898679]">
            Apronly · Hospitality recruitment, thoughtfully connected.
          </footer>
        </div>
      </div>
    </main>
  );
}

export default async function HiringPage() {
  return <HiringPageContent />;
}
