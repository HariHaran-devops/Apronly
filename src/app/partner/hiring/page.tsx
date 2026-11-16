
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { requireAnyRole } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import HiringManagement from "../hiring-management";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

type Restaurant = {
  id: string;
  name: string;
  city: string;
  status: string;
  verification_status: string;
};

function WorkspaceIcon({
  name,
  className = "h-5 w-5",
}: {
  name: "overview" | "business" | "hiring";
  className?: string;
}) {
  const paths = {
    overview: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-7h6v7" />
      </>
    ),
    business: (
      <>
        <path d="M3 10h18l-2-6H5l-2 6Z" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    hiring: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 3V2h6v1M8 9h8M8 13h8M8 17h5" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

function BotanicalDecoration({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 260 300"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M20 286C76 220 113 142 232 18"
        stroke="#8A9561"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M66 225C22 224 5 190 12 165C49 166 77 189 66 225Z" fill="#9BA56D" />
      <path d="M66 225C45 199 31 181 12 165C49 166 77 189 66 225Z" fill="#C2B879" opacity=".72" />
      <path d="M105 177C57 155 57 117 68 96C105 111 123 147 105 177Z" fill="#788A4F" />
      <path d="M105 177C91 145 80 121 68 96C105 111 123 147 105 177Z" fill="#B6B879" opacity=".7" />
      <path d="M145 128C105 91 119 53 135 37C165 65 171 101 145 128Z" fill="#A8AD70" />
      <path d="M145 128C143 91 140 61 135 37C165 65 171 101 145 128Z" fill="#D0C58B" opacity=".65" />
      <path d="M85 239C111 196 151 194 171 207C149 243 111 258 85 239Z" fill="#526F42" />
      <path d="M85 239C117 221 144 211 171 207C149 243 111 258 85 239Z" fill="#91A36B" opacity=".65" />
      <path d="M127 183C153 139 194 139 213 154C190 190 153 203 127 183Z" fill="#6F854B" />
      <path d="M127 183C159 168 186 157 213 154C190 190 153 203 127 183Z" fill="#B3B77A" opacity=".65" />
      <path d="M177 84C196 42 232 35 251 45C235 83 204 103 177 84Z" fill="#89975A" />
      <path d="M177 84C207 66 230 52 251 45C235 83 204 103 177 84Z" fill="#C5BD83" opacity=".68" />
    </svg>
  );
}

const navigation = [
  {
    label: "Overview",
    href: "/partner",
    icon: "overview" as const,
  },
  {
    label: "Business Profile",
    href: "/partner/profile",
    icon: "business" as const,
  },
  {
    label: "Hiring Management",
    href: "/partner/hiring",
    icon: "hiring" as const,
  },
];

function WorkspaceNavigation({
  mobile = false,
}: {
  mobile?: boolean;
}) {
  return (
    <nav
      aria-label="Restaurant workspace"
      className={
        mobile
          ? "flex gap-2 overflow-x-auto pb-1"
          : "flex flex-col gap-2"
      }
    >
      {navigation.map((item) => {
        const active = item.href === "/partner/hiring";

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "group flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-3.5 text-[16px] font-bold transition-all duration-200",
              active
                ? "bg-[#879765] !font-bold !text-white shadow-[0_5px_16px_rgba(0,0,0,0.12)]"
                : "!text-[#F8F5EA] hover:!bg-white/12 hover:!text-white",
            ].join(" ")}
          >
            <WorkspaceIcon
              name={item.icon}
              className="h-6 w-6 shrink-0"
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/partner" className="flex items-center gap-2.5">
      <span className="flex h-11 w-11 items-center justify-center text-[#E7D9A8]">
        <svg
          viewBox="0 0 48 48"
          className="h-10 w-10"
          fill="none"
          aria-hidden="true"
        >
          <path d="M10 34C19 28 25 18 37 8" stroke="#7D8D54" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M14 29C5 24 7 15 10 12C18 16 20 23 14 29Z" fill="#9AA66B" />
          <path d="M22 22C16 13 21 6 25 4C31 11 30 18 22 22Z" fill="#C1B77A" />
          <path d="M25 22C28 12 37 10 42 13C39 22 32 26 25 22Z" fill="#71874D" />
        </svg>
      </span>

      <span>
        <span className="block font-serif text-[30px] font-semibold leading-none tracking-tight text-[#F6F1E5]">
          Apronly
        </span>
        <span className="mt-2 block text-[12px] font-semibold tracking-[0.01em] text-[#D6D8C6]">
          Restaurant Partner
        </span>
      </span>
    </Link>
  );
}

async function HiringPageContent() {
  await connection();

  const access = await requireAnyRole(["restaurant_staff"]);
  const supabase = await createClient();

  const { data: memberships, error: membershipError } = await supabase
    .from("restaurant_memberships")
    .select("id, restaurant_id, role, status")
    .eq("user_id", access.userId);

  if (membershipError) {
    console.error("Restaurant membership lookup failed:", {
      code: membershipError.code,
    });
  }

  const activeMemberships = (memberships ?? []).filter(
    (membership) => membership.status === "active",
  );

  const restaurantIds = activeMemberships.map(
    (membership) => membership.restaurant_id,
  );

  let restaurants: Restaurant[] = [];
  let loadError = false;

  if (restaurantIds.length > 0) {
    const restaurantResult = await supabase
      .from("restaurants")
      .select("id, name, city, status, verification_status")
      .in("id", restaurantIds);

    if (restaurantResult.error) {
      loadError = true;
      console.error("Restaurant hiring workspace lookup failed:", {
        code: restaurantResult.error.code,
      });
    } else {
      restaurants = (restaurantResult.data ?? []) as Restaurant[];
    }
  }

  const restaurantById = new Map(
    restaurants.map((restaurant) => [restaurant.id, restaurant]),
  );

  const avatarInitials = (restaurants[0]?.name ?? "Restaurant Partner")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "RP";

  return (
    <main className={`${dmSans.className} apronly-hiring min-h-screen bg-[#F7F3EA] text-[#292B24]`}>
      <style>{`
        .apronly-hiring .font-serif,
        .apronly-hiring h1,
        .apronly-hiring h2,
        .apronly-hiring h3,
        .apronly-hiring h4,
        .apronly-hiring h5,
        .apronly-hiring h6 {
          font-family: ${cormorant.style.fontFamily}, Georgia, serif !important;
          font-weight: 600;
          letter-spacing: -0.025em;
        }

        .apronly-hiring button,
        .apronly-hiring a,
        .apronly-hiring input,
        .apronly-hiring textarea,
        .apronly-hiring select {
          font-family: ${dmSans.style.fontFamily}, Arial, sans-serif;
        }
      `}</style>

      <div className="min-h-screen lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Sidebar — matching Business Profile */}
        <aside className="relative hidden h-screen self-start overflow-hidden bg-[#203B2A] px-4 py-6 lg:sticky lg:top-0 lg:flex lg:flex-col">
          <div className="relative z-10">
            <Brand />
          </div>

          <div className="relative z-10 mt-14">
            <p className="mb-5 px-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[#E7E8DA]">
              Restaurant workspace
            </p>
            <WorkspaceNavigation />
          </div>

          <div className="relative z-10 mt-auto">
            <div className="relative overflow-hidden rounded-2xl border border-[#A8B18D]/35 bg-[#FFFFFF]/[0.09] p-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)]">
              <p className="relative z-10 text-base font-bold text-[#F4F0E4]">
                Need assistance?
              </p>
              <p className="relative z-10 mt-2 max-w-[150px] text-[13px] leading-5 text-[#E2E4D7]">
                Get help from the Apronly support team.
              </p>
              <span
                aria-hidden="true"
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-xl text-[#E8E5D4]"
              >
                ›
              </span>
              <BotanicalDecoration className="pointer-events-none absolute -bottom-12 -right-5 z-0 h-32 w-28 rotate-12 opacity-35" />
            </div>

            <p className="mt-6 text-[10px] tracking-wide text-[#D5D8C9]/50">
              APRONLY · HOSPITALITY, THOUGHTFULLY CONNECTED
            </p>
          </div>

          <BotanicalDecoration className="pointer-events-none absolute -bottom-5 -left-12 z-0 h-56 w-48 -rotate-12 opacity-55" />
        </aside>

        {/* Main workspace */}
        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-[#E6DFD2] bg-[#F7F3EA]/95 px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-10">
            <div className="flex items-center justify-between gap-4">
              <div className="lg:hidden">
                <Brand />
              </div>

              <div className="hidden lg:block">
                <p className="text-[14px] font-medium text-[#68675D]">
                  Restaurant workspace
                  <span className="mx-2 text-[#C2BBAE]">/</span>
                  <span className="font-semibold text-[#30372D]">
                    Hiring Management
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <span
                  aria-label="Notifications"
                  title="Notifications"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[#263E2D]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                    <path d="M10 21h4" />
                  </svg>
                </span>

                <span
                  aria-label="Restaurant account"
                  title="Restaurant account"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D6C9AE] bg-[#9A8967] text-base font-bold text-white shadow-sm"
                >
                  {avatarInitials}
                </span>

                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="rounded-full border border-[#E2DBCF] bg-white/75 px-4 py-2.5 text-sm font-semibold text-[#4C5147] transition hover:border-[#C9C3B6] hover:bg-white"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-4 lg:hidden">
              <WorkspaceNavigation mobile />
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1600px] px-6 py-9 sm:px-8 lg:px-10 lg:py-10">
            {/* Page heading */}
            <div className="relative mb-9 overflow-hidden rounded-[26px] border border-[#E7DFD1] bg-gradient-to-br from-[#F8F4E9] via-[#F4F0E5] to-[#E9EDE2] px-7 py-9 sm:px-11 sm:py-12">
              <div className="relative z-10 max-w-2xl">
                <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-[#596943]">
                  Recruitment workspace
                </p>

                <h1 className="mt-3 font-serif text-[54px] font-bold leading-[0.98] tracking-[-0.035em] text-[#24251F] sm:text-[68px]">
                  Hiring Management
                </h1>

                <p className="mt-3 max-w-xl text-[17px] font-medium leading-8 text-[#4F5048] sm:text-[19px]">
                  Create hiring requirements, manage your open roles and track
                  every request through Apronly&apos;s review process.
                </p>
              </div>

              <BotanicalDecoration className="absolute -right-2 -top-12 hidden h-64 w-56 rotate-6 text-[#78865B]/20 sm:block" />
              <div className="absolute bottom-0 right-0 h-32 w-64 bg-gradient-to-l from-[#E9EBDD]/50 to-transparent" />
            </div>

            {membershipError || loadError ? (
              <div className="rounded-2xl border border-[#EBD5D1] bg-[#FBF0EE] p-6">
                <h2 className="font-semibold">
                  Unable to load your hiring workspace
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#77766F]">
                  We couldn&apos;t retrieve your restaurant information.
                  Please refresh the page or contact Apronly support.
                </p>
              </div>
            ) : activeMemberships.length === 0 ? (
              <div className="rounded-2xl border border-[#E5DED2] bg-white p-8">
                <h2 className="font-serif text-2xl">
                  No active restaurant membership
                </h2>
                <p className="mt-2 text-base text-[#68675D]">
                  Your restaurant hiring workspace is not currently available.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {activeMemberships.map((membership) => {
                  const restaurant = restaurantById.get(
                    membership.restaurant_id,
                  );

                  if (!restaurant) {
                    return (
                      <div
                        key={membership.id}
                        className="rounded-2xl border border-[#E9DCC6] bg-[#FAF4E9] p-6"
                      >
                        <p className="font-semibold">
                          Restaurant details unavailable
                        </p>
                        <p className="mt-2 text-base text-[#68675D]">
                          We couldn&apos;t retrieve this restaurant&apos;s
                          information. Please contact Apronly support.
                        </p>
                      </div>
                    );
                  }

                  const approved =
                    restaurant.status === "active" &&
                    restaurant.verification_status === "verified";

                  return (
                    <section
                      key={membership.id}
                      className="overflow-hidden rounded-[26px] border border-[#E9E2D6] bg-white shadow-[0_12px_35px_rgba(48,52,39,0.06)]"
                    >
                      {/* Restaurant identity strip */}
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E2D7] bg-gradient-to-r from-[#F8F4E9] to-[#E9EDE4] px-7 py-6 sm:px-9">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#78815F]">
                            Restaurant
                          </p>
                          <h2 className="mt-1 font-serif text-[30px] font-semibold leading-tight text-[#292B24]">
                            {restaurant.name}
                          </h2>
                          <p className="mt-1 text-sm font-medium text-[#77766D]">
                            {restaurant.city}
                          </p>
                        </div>

                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-4 py-2 text-xs font-bold",
                            approved
                              ? "border-[#DCE7D3] bg-[#EDF3E7] text-[#526D43]"
                              : "border-[#E9DCC6] bg-[#FAF2E5] text-[#8A7048]",
                          ].join(" ")}
                        >
                          {approved
                            ? "Verified"
                            : restaurant.verification_status.replaceAll(
                                "_",
                                " ",
                              )}
                        </span>
                      </div>

                      <div className="p-5 sm:p-7 lg:p-8">
                        {approved ? (
                          <HiringManagement restaurantId={restaurant.id} />
                        ) : (
                          <div className="rounded-2xl border border-[#E9DCC6] bg-[#FAF4E9] p-7">
                            <h3 className="font-serif text-2xl text-[#34372F]">
                              Hiring management is not available yet
                            </h3>
                            <p className="mt-2 text-base leading-7 text-[#68675D]">
                              Your restaurant application is currently{" "}
                              {restaurant.status.replaceAll("_", " ")} and
                              verification is{" "}
                              {restaurant.verification_status.replaceAll(
                                "_",
                                " ",
                              )}
                              . Hiring management becomes available after
                              approval.
                            </p>
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            <footer className="mt-12 border-t border-[#E6DFD2] py-7 text-sm text-[#77766D]">
              Apronly · Hospitality recruitment, thoughtfully connected.
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RestaurantHiringPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F7F3EA]">
          <p className="text-base text-[#68675D]">
            Loading your hiring workspace...
          </p>
        </main>
      }
    >
      <HiringPageContent />
    </Suspense>
  );
}
