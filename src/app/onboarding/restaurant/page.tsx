
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RestaurantApplicationForm from "./restaurant-application-form";

async function RestaurantOnboardingContent() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return <RestaurantApplicationForm />;
}

export default function RestaurantOnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F6F2EA]">
          <p className="text-sm text-[#7D8873]">
            Loading restaurant onboarding...
          </p>
        </main>
      }
    >
      <RestaurantOnboardingContent />
    </Suspense>
  );
}
