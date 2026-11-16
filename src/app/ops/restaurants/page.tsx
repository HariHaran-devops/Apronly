
import { connection } from "next/server";
import { requireAnyRole } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";

import OperationsSidebar from "../_components/operations-sidebar";
import RestaurantReview, {
  type RestaurantApplication,
} from "../restaurant-review";

export const instant = false;

async function RestaurantsPageContent() {
  await connection();
  await requireAnyRole(["admin"]);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurants")
    .select(`
      id,
      name,
      legal_name,
      slug,
      description,
      city,
      business_email,
      business_phone,
      website_url,
      category,
      status,
      verification_status,
      review_status,
      review_note,
      reviewed_by,
      reviewed_at,
      created_at,
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
        phone,
        email,
        is_primary
      )
    `)
    .eq("review_status", "pending_review")
    .order("created_at", { ascending: true });

  const applications = (data ?? []) as unknown as RestaurantApplication[];

  return (
    <main className="min-h-screen bg-[#F8F6F0] text-[#26352D] lg:flex">
      <OperationsSidebar active="restaurants" />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between border-b border-[#E8E2D7] bg-[#F8F6F0]/95 px-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs font-medium text-[#7B8178]">
              Operations / Business
            </p>
            <p className="mt-1 text-sm font-semibold text-[#26352D]">
              Restaurant verification
            </p>
          </div>

          <span className="rounded-full border border-[#DCE3D8] bg-[#EEF2EA] px-3 py-1.5 text-xs font-semibold text-[#526B50]">
            Administrator
          </span>
        </header>

        <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 lg:px-10">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#71836A]">
              APRONLY · BUSINESS OPERATIONS
            </p>

            <h1 className="mt-3 font-serif text-4xl tracking-tight text-[#26352D] sm:text-5xl">
              Restaurant applications
            </h1>

            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#73786F]">
              Review restaurant business information, inspect registered
              outlets and manage partner verification decisions.
            </p>
          </div>

          <RestaurantReview
            applications={applications}
            loadError={error?.message ?? null}
          />

          <footer className="mt-12 border-t border-[#E8E2D7] py-6 text-xs text-[#898679]">
            Apronly · Hospitality recruitment, thoughtfully connected.
          </footer>
        </div>
      </div>
    </main>
  );
}

export default async function RestaurantsPage() {
  return <RestaurantsPageContent />;
}
