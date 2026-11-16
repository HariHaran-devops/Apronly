import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import RestaurantApplicationForm from "@/app/onboarding/restaurant/restaurant-application-form";

async function EditRestaurantApplicationContent() {
  await connection();

  const access = await requireAnyRole(["restaurant_staff"]);
  const supabase = await createClient();

  const { data: membership, error: membershipError } = await supabase
    .from("restaurant_memberships")
    .select("restaurant_id, role, status")
    .eq("user_id", access.userId)
    .eq("role", "owner")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    redirect("/partner");
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select(
      "id, name, legal_name, description, business_email, business_phone, website_url, category, status, verification_status"
    )
    .eq("id", membership.restaurant_id)
    .maybeSingle();

  if (
    restaurantError ||
    !restaurant ||
    restaurant.status !== "pending" ||
    restaurant.verification_status !== "unverified"
  ) {
    redirect("/partner");
  }

  const { data: outlet, error: outletError } = await supabase
    .from("restaurant_outlets")
    .select(
      "name, address_line1, address_line2, landmark, city, state, postal_code, country, phone, email"
    )
    .eq("restaurant_id", restaurant.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (outletError || !outlet) {
    redirect("/partner");
  }

  return (
    <RestaurantApplicationForm
      isEditing
      initialValues={{
        name: restaurant.name ?? "",
        legalName: restaurant.legal_name ?? "",
        description: restaurant.description ?? "",
        businessEmail: restaurant.business_email ?? "",
        businessPhone: restaurant.business_phone ?? "",
        websiteUrl: restaurant.website_url ?? "",
        category: restaurant.category ?? "",
        outletName: outlet.name ?? "",
        addressLine1: outlet.address_line1 ?? "",
        addressLine2: outlet.address_line2 ?? "",
        landmark: outlet.landmark ?? "",
        city: outlet.city ?? "",
        state: outlet.state ?? "",
        postalCode: outlet.postal_code ?? "",
        country: outlet.country ?? "India",
        outletPhone: outlet.phone ?? "",
        outletEmail: outlet.email ?? "",
      }}
    />
  );
}

export default function EditRestaurantApplicationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-muted">Loading your application...</p>
        </main>
      }
    >
      <EditRestaurantApplicationContent />
    </Suspense>
  );
}
