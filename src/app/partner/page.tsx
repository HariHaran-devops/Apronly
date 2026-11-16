import { Suspense } from "react";

import { connection } from "next/server";

import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/authorization";

import { createClient } from "@/lib/supabase/server";

type RestaurantStatus = "pending" | "active" | "suspended" | "rejected";

type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

type MembershipStatus = "invited" | "active" | "suspended" | "revoked";

type Restaurant = {

  id: string;

  name: string;

  legal_name: string | null;

  description: string | null;

  city: string;

  business_email: string | null;

  business_phone: string | null;

  website_url: string | null;

  category: string | null;

  status: RestaurantStatus;

  verification_status: VerificationStatus;

};

type Outlet = {

  id: string;

  restaurant_id: string;

  name: string;

  city: string;

  address_line1: string | null;

  address_line2: string | null;

  landmark: string | null;

  state: string | null;

  postal_code: string | null;

  country: string;

  phone: string | null;

  email: string | null;

  is_primary: boolean;

};

type Membership = {

  id: string;

  restaurant_id: string;

  role: string;

  status: MembershipStatus;

};

type HiringRequestSummary = {

  id: string;

  restaurant_id: string;

  title: string;

  department: string;

  openings: number;

  city: string;

  status: string;

  created_at: string;

};

function getApplicationState(

  restaurantStatus: RestaurantStatus,

  verificationStatus: VerificationStatus,

  membershipStatus: MembershipStatus,

) {

  if (membershipStatus === "suspended" || membershipStatus === "revoked") {

    return {

      title: "Membership restricted",

      description:

        "Your access to this restaurant workspace is currently restricted. Contact Apronly support for assistance.",

      tone: "warning",

      approved: false,

    };

  }

  if (membershipStatus === "invited") {

    return {

      title: "Invitation pending",

      description: "Your restaurant membership has not been activated yet.",

      tone: "neutral",

      approved: false,

    };

  }

  if (restaurantStatus === "suspended") {

    return {

      title: "Restaurant suspended",

      description:

        "This restaurant workspace is currently suspended. Contact Apronly support for further information.",

      tone: "warning",

      approved: false,

    };

  }

  if (

    restaurantStatus === "rejected" ||

    verificationStatus === "rejected"

  ) {

    return {

      title: "Application not approved",

      description:

        "Your restaurant application was not approved. Please contact Apronly support for information about the decision and possible next steps.",

      tone: "danger",

      approved: false,

    };

  }

  if (

    restaurantStatus === "active" &&

    verificationStatus === "verified" &&

    membershipStatus === "active"

  ) {

    return {

      title: "Restaurant approved",

      description:

        "Your restaurant has been verified and approved. Your business, outlet management and hiring workspace are available.",

      tone: "success",

      approved: true,

    };

  }

  return {

    title: "Application under review",

    description:

      "Your restaurant application has been received. Apronly will review your details before enabling hiring capabilities.",

    tone: "neutral",

    approved: false,

  };

}

function LeafBranch({ className = "" }: { className?: string }) {

  return (

    <svg

      aria-hidden="true"

      viewBox="0 0 220 220"

      fill="none"

      className={className}

    >

      <path

        d="M20 202C75 153 120 92 190 17"

        stroke="#8D9B69"

        strokeWidth="2.5"

        strokeLinecap="round"

      />

      <path d="M65 158C29 154 13 127 18 103C49 108 69 129 65 158Z" fill="#AAB47B" />

      <path d="M91 129C79 94 97 67 124 59C132 89 117 115 91 129Z" fill="#788B4F" />

      <path d="M119 96C99 66 111 36 136 20C154 47 145 77 119 96Z" fill="#AAB47B" />

      <path d="M51 174C53 143 31 124 7 128C8 156 27 174 51 174Z" fill="#788B4F" />

      <path d="M151 62C142 31 160 9 187 3C194 31 176 55 151 62Z" fill="#AAB47B" />

      <path d="M83 143L18 103M103 113L124 59M127 84L136 20M51 174L7 128M151 62L187 3" stroke="#788B4F" strokeWidth="1.3" />

    </svg>

  );

}

function Icon({

  name,

  className = "h-5 w-5",

}: {

  name: "home" | "store" | "briefcase" | "pin" | "check" | "arrow" | "plus" | "bell" | "users";

  className?: string;

}) {

  const paths = {

    home: (

      <>

        <path d="m3 10 9-7 9 7" />

        <path d="M5 9v11h14V9M9 20v-6h6v6" />

      </>

    ),

    store: (

      <>

        <path d="M3 10h18l-2-6H5l-2 6Z" />

        <path d="M5 10v10h14V10M9 20v-6h6v6" />

      </>

    ),

    briefcase: (

      <>

        <rect x="3" y="7" width="18" height="14" rx="2" />

        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />

      </>

    ),

    pin: (

      <>

        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />

        <circle cx="12" cy="10" r="2.5" />

      </>

    ),

    check: <path d="m5 12 4 4L19 6" />,

    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,

    plus: <path d="M12 5v14M5 12h14" />,

    bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,

    users: (

      <>

        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />

        <circle cx="10" cy="7" r="4" />

        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />

      </>

    ),

  };

  return (

    <svg

      aria-hidden="true"

      viewBox="0 0 24 24"

      fill="none"

      stroke="currentColor"

      strokeWidth="1.8"

      strokeLinecap="round"

      strokeLinejoin="round"

      className={className}

    >

      {paths[name]}

    </svg>

  );

}

function Brand() {

  return (

    <Link href="/partner" className="flex items-center gap-3">

      <span className="text-[#D7D9A5]">

        <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" aria-hidden="true">

          <path d="M8 37C20 27 28 17 39 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

          <path d="M19 27C7 26 5 17 7 10c10 2 15 9 12 17Z" fill="currentColor" />

          <path d="M27 18C25 8 31 3 39 2c2 8-3 14-12 16Z" fill="#AAB47B" />

        </svg>

      </span>

      <span>

        <span className="block font-serif text-[30px] leading-none tracking-tight text-[#FFF9E9]">Apronly</span>

        <span className="mt-1.5 block text-[12px] font-medium text-[#E4E4D4]">Restaurant Partner</span>

      </span>

    </Link>

  );

}

function Sidebar() {

  return (

    <aside className="relative hidden h-screen overflow-hidden bg-[#203B2A] px-3 py-7 text-[#F8F4E9] lg:sticky lg:top-0 lg:flex lg:flex-col">

      <Brand />

      <p className="mt-14 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#B8C19A]">

        Restaurant workspace

      </p>

      <nav className="mt-5 space-y-2" aria-label="Restaurant workspace">

        <Link

          href="/partner"

          aria-current="page"

          className="flex items-center gap-2.5 whitespace-nowrap rounded-2xl bg-[#899665] px-3 py-3.5 text-[14px] font-bold text-white shadow-sm"

        >

          <Icon name="home" className="h-6 w-6" />

          Overview

        </Link>

        <Link

          href="/partner/profile"

          className="flex items-center gap-2.5 whitespace-nowrap rounded-2xl px-3 py-3.5 text-[14px] font-semibold text-[#F2F0E5] transition hover:bg-white/10"

        >

          <Icon name="store" className="h-6 w-6" />

          Business Profile

        </Link>

        <Link

          href="/partner/hiring"

          className="flex items-center gap-2.5 whitespace-nowrap rounded-2xl px-3 py-3.5 text-[14px] font-semibold text-[#F2F0E5] transition hover:bg-white/10"

        >

          <Icon name="briefcase" className="h-6 w-6" />

          Hiring Management

        </Link>

      </nav>

      <div className="relative mt-auto overflow-hidden rounded-2xl border border-[#AAB58B]/50 bg-white/[0.07] p-4">

        <div className="relative z-10 flex items-center gap-2.5">

          <span className="text-[#E6E4C9]"><Icon name="users" /></span>

          <p className="text-[15px] font-bold text-white">Need assistance?</p>

        </div>

        <p className="relative z-10 mt-2 text-[13px] leading-5 text-[#E1E3D5]">

          Get help from the Apronly support team.

        </p>

        <span className="relative z-10 mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-[#D7D9A5]">

          Help &amp; Support <Icon name="arrow" className="h-4 w-4" />

        </span>

        <LeafBranch className="pointer-events-none absolute -bottom-12 -left-7 w-36 opacity-45" />

      </div>

    </aside>

  );

}

function StatusNotice({

  title,

  description,

  tone,

}: {

  title: string;

  description: string;

  tone: string;

}) {

  const tones: Record<string, string> = {

    success: "border-[#DCE8D5] bg-[#F1F6EC]",

    warning: "border-[#E9DCC6] bg-[#FAF4E9]",

    danger: "border-[#EBD5D1] bg-[#FBF0EE]",

    neutral: "border-[#E5DED2] bg-[#F8F6F0]",

  };

  return (

    <div className={`rounded-2xl border p-5 ${tones[tone] ?? tones.neutral}`}>

      <div className="flex items-start gap-3">

        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/85 text-[#55734D]">

          <Icon name="check" className="h-4 w-4" />

        </span>

        <div>

          <h3 className="text-[16px] font-bold text-[#30352B]">{title}</h3>

          <p className="mt-1.5 text-[14px] leading-6 text-[#66685E]">{description}</p>

        </div>

      </div>

    </div>

  );

}

function MetricCard({

  label,

  value,

  icon,

  href,

  featured = false,

}: {

  label: string;

  value: string | number;

  icon: "store" | "pin" | "briefcase" | "check";

  href?: string;

  featured?: boolean;

}) {

  const content = (

    <div className={`h-full rounded-[22px] border p-5 shadow-[0_8px_24px_rgba(40,38,30,0.035)] sm:p-6 ${featured ? "border-[#D8E2CE] bg-[#F1F5E9]" : "border-[#E7E0D5] bg-[#FFFCF6]"} ${href ? "transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(40,38,30,0.08)]" : ""}`}>

      <div className="flex h-10 w-10 items-center justify-center text-[#59643A]">

        <Icon name={icon} className="h-9 w-9" />

      </div>

      <p className="mt-3 text-[15px] font-semibold text-[#44473D]">{label}</p>

      <div className="mt-1 flex items-center justify-between gap-2">

        <p className={`font-serif text-[34px] font-semibold leading-tight ${featured ? "text-[#285D35]" : "text-[#24271F]"}`}>{value}</p>

        {featured ? (

          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#557A46] text-white">

            <Icon name="check" className="h-5 w-5" />

          </span>

        ) : href ? (

          <Icon name="arrow" className="h-5 w-5 text-[#485234]" />

        ) : null}

      </div>

    </div>

  );

  return href ? <Link href={href} className="block h-full">{content}</Link> : content;

}

function Initials({ name }: { name: string }) {

  const initials = name

    .trim()

    .split(/\s+/)

    .slice(0, 2)

    .map((part) => part.charAt(0).toUpperCase())

    .join("");

  return initials || "R";

}

function formatHiringStatus(status: string) {

  const labels: Record<string, string> = {

    approved: "Active",

    active: "Active",

    pending_review: "Pending review",

    changes_requested: "Changes requested",

    draft: "Draft",

    closed: "Closed",

    rejected: "Rejected",

  };

  return labels[status] ?? status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

}

function hiringStatusClasses(status: string) {

  const classes: Record<string, string> = {

    approved: "bg-[#E7F0DF] text-[#42643B]",

    active: "bg-[#E7F0DF] text-[#42643B]",

    pending_review: "bg-[#F7EBD8] text-[#8A673A]",

    changes_requested: "bg-[#F7EBD8] text-[#8A673A]",

    draft: "bg-[#EFEEE9] text-[#68695F]",

    closed: "bg-[#EFEEE9] text-[#68695F]",

    rejected: "bg-[#F8E8E5] text-[#9A5148]",

  };

  return classes[status] ?? "bg-[#EFEEE9] text-[#68695F]";

}

async function RestaurantDashboardContent() {

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

  const membershipRecords = (memberships ?? []) as Membership[];

  const activeRestaurantIds = membershipRecords

    .filter((membership) => membership.status === "active")

    .map((membership) => membership.restaurant_id);

  let restaurantRecords: Restaurant[] = [];

  let outletRecords: Outlet[] = [];

  let hiringRequestRecords: HiringRequestSummary[] = [];

  let restaurantQueryFailed = false;

  let outletQueryFailed = false;

  let hiringQueryFailed = false;

  if (activeRestaurantIds.length > 0) {

    const [restaurantResult, outletResult, hiringResult] = await Promise.all([

      supabase

        .from("restaurants")

        .select("id, name, legal_name, description, city, business_email, business_phone, website_url, category, status, verification_status")

        .in("id", activeRestaurantIds),

      supabase

        .from("restaurant_outlets")

        .select("id, restaurant_id, name, city, address_line1, address_line2, landmark, state, postal_code, country, phone, email, is_primary")

        .in("restaurant_id", activeRestaurantIds)

        .order("is_primary", { ascending: false })

        .order("name", { ascending: true }),

      supabase

        .from("restaurant_hiring_requests")

        .select("id, restaurant_id, title, department, openings, city, status, created_at")

        .in("restaurant_id", activeRestaurantIds)

        .order("created_at", { ascending: false }),

    ]);

    if (restaurantResult.error) {

      console.error("Restaurant details lookup failed:", {

        code: restaurantResult.error.code,

      });

      restaurantQueryFailed = true;

    } else {

      restaurantRecords = (restaurantResult.data ?? []) as Restaurant[];

    }

    if (outletResult.error) {

      console.error("Restaurant outlet lookup failed:", {

        code: outletResult.error.code,

      });

      outletQueryFailed = true;

    } else {

      outletRecords = (outletResult.data ?? []) as Outlet[];

    }

    if (hiringResult.error) {

      console.error("Restaurant hiring requests lookup failed:", {

        code: hiringResult.error.code,

      });

      hiringQueryFailed = true;

    } else {

      hiringRequestRecords = (hiringResult.data ?? []) as HiringRequestSummary[];

    }

  }

  const restaurantById = new Map(

    restaurantRecords.map((restaurant) => [restaurant.id, restaurant]),

  );

  const outletsByRestaurant = new Map<string, Outlet[]>();

  const hiringByRestaurant = new Map<string, HiringRequestSummary[]>();

  for (const outlet of outletRecords) {

    const existing = outletsByRestaurant.get(outlet.restaurant_id) ?? [];

    existing.push(outlet);

    outletsByRestaurant.set(outlet.restaurant_id, existing);

  }

  for (const request of hiringRequestRecords) {

    const existing = hiringByRestaurant.get(request.restaurant_id) ?? [];

    existing.push(request);

    hiringByRestaurant.set(request.restaurant_id, existing);

  }

  return (

    <main className="min-h-screen bg-[#F7F3EA] text-[#292B24]">

      <div className="min-h-screen lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">

        <Sidebar />

        <div className="min-w-0">

          <header className="relative z-10 flex h-[68px] items-center justify-between border-b border-[#E8E1D6] bg-[#F7F3EA]/95 px-5 backdrop-blur-xl sm:px-8 lg:px-10">

            <div className="flex items-center gap-3 lg:hidden">

              <Brand />

            </div>

            <div className="hidden text-[13px] text-[#6D6D61] lg:block">

              Restaurant workspace <span className="mx-2 text-[#C9C2B5]">/</span>

              <span className="font-semibold text-[#30342A]">Overview</span>

            </div>

            <div className="ml-auto flex items-center gap-4">

              <span className="flex h-9 w-9 items-center justify-center text-[#344B37]" aria-label="Notifications">

                <Icon name="bell" className="h-6 w-6" />

              </span>

              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2D9C7] bg-[#A18E68] text-[13px] font-bold text-white">

                {restaurantRecords[0] ? <Initials name={restaurantRecords[0].name} /> : "R"}

              </span>

              <form action="/auth/signout" method="post">

                <button

                  type="submit"

                  className="rounded-full border border-[#E4DDD1] bg-white/85 px-4 py-2.5 text-[13px] font-semibold text-[#55564D] transition hover:bg-white"

                >

                  Sign out

                </button>

              </form>

            </div>

          </header>

          <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-8 lg:px-10 lg:py-8">

            <section className="relative isolate mb-8 overflow-hidden rounded-[28px] border border-[#E8E0D3] bg-gradient-to-r from-[#F8F2E6] via-[#F5F1E8] to-[#E9EDE2] px-7 py-8 sm:px-10 sm:py-10 lg:min-h-[205px] lg:px-12">

              <div className="relative z-10 flex min-h-[135px] flex-col justify-center">

                <p className="text-[13px] font-semibold text-[#35382E]">Welcome back,</p>

                <h1 className="mt-1 max-w-3xl font-serif text-[42px] font-semibold leading-[1.05] tracking-tight text-[#24251F] sm:text-[52px] lg:text-[60px]">

                  {restaurantRecords[0]?.name ?? "Your Restaurant"}

                </h1>

                <p className="mt-3 max-w-2xl text-[16px] leading-7 text-[#55564D] sm:text-[18px]">

                  Manage your business, outlets and hiring, all in one place.

                </p>

              </div>

              <LeafBranch className="pointer-events-none absolute -right-2 -top-10 hidden w-[260px] opacity-90 sm:block lg:w-[310px]" />

            </section>

            {membershipError ? (

              <StatusNotice

                title="Unable to load your workspace"

                description="We couldn't retrieve your restaurant membership details. Please refresh the page or contact Apronly support if the problem continues."

                tone="danger"

              />

            ) : membershipRecords.length === 0 ? (

              <StatusNotice

                title="Restaurant membership unavailable"

                description="Your account currently has no restaurant membership. Please contact Apronly support to resolve your account access."

                tone="warning"

              />

            ) : (

              <div className="space-y-10">

                {membershipRecords.map((membership) => {

                  const restaurant = restaurantById.get(membership.restaurant_id);

                  if (membership.status === "active" && restaurantQueryFailed) {

                    return (

                      <section key={membership.id} className="rounded-[26px] border border-[#E7E0D5] bg-white p-6 shadow-sm">

                        <StatusNotice

                          title="Unable to load restaurant details"

                          description="Your membership was found, but we couldn't retrieve the restaurant's approval details. Management access remains unavailable until this is resolved."

                          tone="warning"

                        />

                      </section>

                    );

                  }

                  if (membership.status === "active" && !restaurant) {

                    return (

                      <section key={membership.id} className="rounded-[26px] border border-[#E7E0D5] bg-white p-6 shadow-sm">

                        <StatusNotice

                          title="Restaurant details unavailable"

                          description="Your active membership was found, but we couldn't retrieve the restaurant record. Contact Apronly support."

                          tone="warning"

                        />

                      </section>

                    );

                  }

                  const applicationState = restaurant

                    ? getApplicationState(

                        restaurant.status,

                        restaurant.verification_status,

                        membership.status,

                      )

                    : {

                        title: "Membership restricted",

                        description: "This membership is not active. Restaurant details are unavailable until access is restored.",

                        tone: "warning",

                        approved: false,

                      };

                  const outlets = outletsByRestaurant.get(membership.restaurant_id) ?? [];

                  const isApproved = applicationState.approved;

                  return (

                    <section key={membership.id} className="space-y-7">

                      {membershipRecords.length > 1 && (

                        <div className="flex items-center justify-between gap-3">

                          <div>

                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#78865B]">Restaurant workspace</p>

                            <h2 className="mt-1 font-serif text-2xl font-semibold">{restaurant?.name ?? "Restaurant workspace"}</h2>

                          </div>

                          <span className="rounded-full border border-[#E5DED2] bg-white px-3 py-1.5 text-xs font-semibold capitalize text-[#62645A]">{membership.role}</span>

                        </div>

                      )}

                      {!isApproved && (

                        <StatusNotice

                          title={applicationState.title}

                          description={applicationState.description}

                          tone={applicationState.tone}

                        />

                      )}

                      {restaurant?.status === "pending" &&

                        restaurant.verification_status === "unverified" &&

                        membership.status === "active" &&

                        membership.role === "owner" && (

                          <Link

                            href="/partner/edit"

                            className="inline-flex items-center rounded-full bg-[#263E2D] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#344F39]"

                          >

                            Edit application <span className="ml-2">→</span>

                          </Link>

                        )}

                      {isApproved && restaurant && (

                        <>

                          {outletQueryFailed ? (

                            <StatusNotice

                              title="Unable to load outlets"

                              description="Your restaurant is approved, but outlet information could not be retrieved. Refresh the page or contact support."

                              tone="warning"

                            />

                          ) : (

                            <>

                              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

                                <MetricCard

                                  label="Business Status"

                                  value="Verified"

                                  icon="check"

                                  featured

                                />

                                <MetricCard

                                  label="Outlets"

                                  value={outlets.length}

                                  icon="pin"

                                  href="/partner/profile"

                                />

                                <MetricCard

                                  label="Active Requirements"

                                  value={

                                    (hiringByRestaurant.get(restaurant.id) ?? [])

                                      .filter((request) => request.status === "approved").length

                                  }

                                  icon="briefcase"

                                  href="/partner/hiring"

                                />

                              </section>

                              <section>

                                <h2 className="font-serif text-[29px] font-semibold tracking-tight text-[#292B24] sm:text-[32px]">

                                  Quick Actions

                                </h2>

                                <div className="mt-4 grid gap-3 md:grid-cols-2">

                                  <Link

                                    href="/partner/profile"

                                    className="inline-flex min-h-[60px] items-center justify-center gap-3 rounded-2xl bg-[#263E2D] px-5 py-4 text-[15px] font-bold !text-white shadow-[0_8px_20px_rgba(38,62,45,0.16)] [&_*]:!text-white transition hover:-translate-y-0.5 hover:bg-[#344F39] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#78865B] focus-visible:ring-offset-2"

                                  >

                                    <Icon name="store" className="h-6 w-6" />

                                    Update Business Profile

                                  </Link>

                                  <Link

                                    href="/partner/hiring"

                                    className="inline-flex min-h-[58px] items-center justify-center gap-3 rounded-2xl border border-[#D9D0C1] bg-[#FBF8F1] px-5 py-4 text-[15px] font-bold text-[#292B24] transition hover:bg-white"

                                  >

                                    <Icon name="plus" className="h-6 w-6" />

                                    Create Hiring Requirement

                                  </Link>

                                </div>

                              </section>

                              <section className="grid items-start gap-5 xl:grid-cols-[1.15fr_0.85fr]">

                                <div className="overflow-hidden rounded-[26px] border border-[#E7E0D5] bg-[#FFFCF6] shadow-[0_10px_30px_rgba(40,38,30,0.045)]">

                                  <div className="flex items-center justify-between gap-3 border-b border-[#EEE8DE] px-5 py-5 sm:px-6">

                                    <div className="flex min-w-0 items-center gap-3">

                                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF1E5] text-[#56633B]">

                                        <Icon name="briefcase" className="h-6 w-6" />

                                      </span>

                                      <div className="min-w-0">

                                        <h2 className="font-serif text-[23px] font-semibold text-[#292B24] sm:text-[26px]">

                                          Recent Hiring Requirements

                                        </h2>

                                        <p className="mt-0.5 text-[12px] text-[#858276]">

                                          Your latest recruitment activity

                                        </p>

                                      </div>

                                    </div>

                                    <Link

                                      href="/partner/hiring"

                                      className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[13px] font-bold text-[#465638] transition hover:bg-[#F0F1E8]"

                                    >

                                      View all <Icon name="arrow" className="h-4 w-4" />

                                    </Link>

                                  </div>

                                  {hiringQueryFailed ? (

                                    <div className="p-5 sm:p-6">

                                      <p className="rounded-2xl border border-[#E9DCC6] bg-[#FAF4E9] p-4 text-[13px] leading-6 text-[#756348]">

                                        Hiring requirements could not be loaded. Open Hiring Management to try again.

                                      </p>

                                    </div>

                                  ) : (hiringByRestaurant.get(restaurant.id) ?? []).length === 0 ? (

                                    <div className="p-5 sm:p-6">

                                      <div className="rounded-2xl border border-dashed border-[#DED7CA] bg-white/70 px-5 py-8 text-center">

                                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1F2E9] text-[#68764C]">

                                          <Icon name="briefcase" className="h-6 w-6" />

                                        </span>

                                        <p className="mt-3 text-[15px] font-semibold text-[#34372F]">

                                          No hiring requirements yet

                                        </p>

                                        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-5 text-[#77766D]">

                                          Create your first requirement to start building your restaurant team.

                                        </p>

                                        <Link

                                          href="/partner/hiring"

                                          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#263E2D] px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#344F39]"

                                        >

                                          <Icon name="plus" className="h-4 w-4" /> Create requirement

                                        </Link>

                                      </div>

                                    </div>

                                  ) : (

                                    <div className="max-h-[420px] space-y-3 overflow-y-auto p-4 sm:p-5 [scrollbar-color:#AAB58B_transparent] [scrollbar-width:thin] hover:[scrollbar-color:#78865B_transparent]">

                                      {(hiringByRestaurant.get(restaurant.id) ?? []).slice(0, 12).map((request) => (

                                        <article

                                          key={request.id}

                                          className="flex items-center gap-3 rounded-2xl border border-[#EAE3D8] bg-white/95 p-3.5 shadow-[0_2px_8px_rgba(40,38,30,0.025)] transition duration-200 hover:-translate-y-0.5 hover:border-[#C9D2B8] hover:shadow-[0_8px_18px_rgba(40,38,30,0.06)] sm:gap-4 sm:p-4"

                                        >

                                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F3F1E7] text-[#59643A]">

                                            <Icon name="briefcase" className="h-5 w-5" />

                                          </span>

                                          <div className="min-w-0 flex-1">

                                            <p className="truncate text-[14px] font-bold text-[#303229] sm:text-[15px]">

                                              {request.title}

                                            </p>

                                            <p className="mt-1 truncate text-[12px] text-[#77766D] sm:text-[13px]">

                                              {request.department} <span className="mx-1.5 text-[#C2BBAE]">·</span>

                                              {request.openings} {request.openings === 1 ? "opening" : "openings"} <span className="mx-1.5 text-[#C2BBAE]">·</span>

                                              {request.city}

                                            </p>

                                            <p className="mt-1 text-[11px] font-medium text-[#9A968B]">

                                              Posted {new Date(request.created_at).toLocaleDateString("en-IN", {

                                                day: "numeric",

                                                month: "short",

                                                year: "numeric",

                                              })}

                                            </p>

                                          </div>

                                          <span className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold capitalize ${hiringStatusClasses(request.status)}`}>

                                            {formatHiringStatus(request.status)}

                                          </span>

                                        </article>

                                      ))}

                                    </div>

                                  )}

                                </div>

                                <div className="overflow-hidden rounded-[26px] border border-[#E7E0D5] bg-[#FFFCF6] shadow-[0_10px_30px_rgba(40,38,30,0.045)]">

                                  <div className="flex items-center justify-between gap-3 border-b border-[#EEE8DE] px-5 py-5 sm:px-6">

                                    <div className="flex items-center gap-3">

                                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF1E5] text-[#56633B]">

                                        <Icon name="pin" className="h-6 w-6" />

                                      </span>

                                      <div>

                                        <h2 className="font-serif text-[23px] font-semibold text-[#292B24] sm:text-[26px]">

                                          Your Outlets

                                        </h2>

                                        <p className="mt-0.5 text-[12px] text-[#858276]">

                                          {outlets.length} {outlets.length === 1 ? "location" : "locations"} registered

                                        </p>

                                      </div>

                                    </div>

                                    <Link

                                      href="/partner/profile"

                                      className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[13px] font-bold text-[#465638] transition hover:bg-[#F0F1E8]"

                                    >

                                      View all <Icon name="arrow" className="h-4 w-4" />

                                    </Link>

                                  </div>

                                  {outlets.length === 0 ? (

                                    <div className="p-5 sm:p-6">

                                      <div className="rounded-2xl border border-dashed border-[#DED7CA] bg-white/70 px-5 py-8 text-center">

                                        <p className="text-[15px] font-semibold text-[#34372F]">No outlets added</p>

                                        <p className="mt-1 text-[13px] leading-5 text-[#77766D]">

                                          Add your restaurant's first location in Business Profile.

                                        </p>

                                        <Link

                                          href="/partner/profile"

                                          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#263E2D] px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#344F39]"

                                        >

                                          <Icon name="plus" className="h-4 w-4" /> Add outlet

                                        </Link>

                                      </div>

                                    </div>

                                  ) : (

                                    <div className="max-h-[420px] space-y-3 overflow-y-auto p-4 sm:p-5 [scrollbar-color:#AAB58B_transparent] [scrollbar-width:thin] hover:[scrollbar-color:#78865B_transparent]">

                                      {outlets.map((outlet) => (

                                        <article

                                          key={outlet.id}

                                          className="flex items-center gap-3 rounded-2xl border border-[#EAE3D8] bg-white/95 p-3.5 shadow-[0_2px_8px_rgba(40,38,30,0.025)] transition duration-200 hover:-translate-y-0.5 hover:border-[#C9D2B8] hover:shadow-[0_8px_18px_rgba(40,38,30,0.06)] sm:gap-4 sm:p-4"

                                        >

                                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F3F1E7] text-[#59643A]">

                                            <Icon name="store" className="h-5 w-5" />

                                          </span>

                                          <div className="min-w-0 flex-1">

                                            <div className="flex flex-wrap items-center gap-2">

                                              <p className="truncate text-[14px] font-bold text-[#303229] sm:text-[15px]">{outlet.name}</p>

                                              {outlet.is_primary && (

                                                <span className="rounded-full bg-[#E8EEDC] px-2.5 py-1 text-[10px] font-bold text-[#526C42]">Primary</span>

                                              )}

                                            </div>

                                            <p className="mt-1 truncate text-[12px] text-[#77766D] sm:text-[13px]">{outlet.city}</p>

                                          </div>

                                        </article>

                                      ))}

                                    </div>

                                  )}

                                </div>

                              </section>

                            </>

                          )}

                        </>

                      )}

                    </section>

                  );

                })}

              </div>

            )}

            <footer className="mt-12 border-t border-[#E6DFD2] py-6 text-[13px] text-[#898679]">

              Apronly · Hospitality recruitment, thoughtfully connected.

            </footer>

          </div>

        </div>

      </div>

    </main>

  );

}

export default function RestaurantDashboardPage() {

  return (

    <Suspense

      fallback={

        <main className="flex min-h-screen items-center justify-center bg-[#F7F3EA]">

          <p className="text-sm text-[#6D6D61]">Loading your restaurant workspace...</p>

        </main>

      }

    >

      <RestaurantDashboardContent />

    </Suspense>

  );

}
