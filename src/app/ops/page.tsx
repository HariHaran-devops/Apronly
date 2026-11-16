
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/authorization";

type IconName =
  | "home"
  | "users"
  | "store"
  | "document"
  | "chart"
  | "search"
  | "calendar"
  | "coins";

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    store: (
      <>
        <path d="M3 10h18l-1.5-6h-15L3 10Z" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
        <path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      </>
    ),
    document: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h8" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V13h4v7" />
        <path d="M10 20V8h4v12" />
        <path d="M16 20V4h4v16" />
      </>
    ),
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="7.3" />
        <path d="m16.2 16.2 4.3 4.3" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    coins: (
      <>
        <ellipse cx="9" cy="6" rx="6" ry="3" />
        <path d="M3 6v5c0 1.66 2.69 3 6 3s6-1.34 6-3V6" />
        <path d="M3 11v5c0 1.66 2.69 3 6 3 1.1 0 2.13-.16 3-.44" />
        <ellipse cx="17" cy="13" rx="4" ry="2" />
        <path d="M13 13v5c0 1.1 1.79 2 4 2s4-.9 4-2v-5" />
        <path d="M13 16c0 1.1 1.79 2 4 2s4-.9 4-2" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

const operationalAreas = [
  {
    category: "PEOPLE",
    title: "Candidate management",
    description:
      "Search candidate profiles, experience, skills and employment preferences.",
    status: "Candidate search active",
    icon: "users" as const,
    href: "/ops/candidates",
    active: true,
  },
  {
    category: "BUSINESS",
    title: "Restaurant verification",
    description:
      "Review restaurant applications and approve business accounts.",
    status: "Verification workflow active",
    icon: "store" as const,
    href: "/ops/restaurants",
    active: true,
  },
  {
    category: "RECRUITMENT",
    title: "Job approvals",
    description:
      "Review hiring requirements before they enter Apronly's private matching workflow.",
    status: "Review workflow active",
    icon: "document" as const,
    href: "/ops/hiring",
    active: true,
  },
  {
    category: "RECRUITMENT",
    title: "Screening and shortlisting",
    description:
      "Evaluate matched candidates and manage private shortlists.",
    status: "Matching foundation deployed",
    icon: "search" as const,
    active: false,
  },
  {
    category: "RECRUITMENT",
    title: "Interviews and placements",
    description:
      "Coordinate interviews and track selection, joining and placement.",
    status: "Not implemented",
    icon: "calendar" as const,
    active: false,
  },
  {
    category: "OPERATIONS",
    title: "Referrals and finance",
    description:
      "Manage referral eligibility, commissions, invoices and payouts.",
    status: "Not implemented",
    icon: "coins" as const,
    active: false,
  },
];

const navigation = [
  { label: "Overview", href: "/ops", icon: "home" as const, active: true },
  {
    label: "Candidates",
    href: "/ops/candidates",
    icon: "users" as const,
  },
  {
    label: "Restaurants",
    href: "/ops/restaurants",
    icon: "store" as const,
  },
  {
    label: "Hiring approvals",
    href: "/ops/hiring",
    icon: "document" as const,
  },
  {
    label: "Recruitment pipeline",
    href: "/ops/recruitment-pipeline",
    icon: "chart" as const,
  },
];

const futureNavigation = [
  { label: "Screening & shortlisting", icon: "search" as const },
  { label: "Interviews & placements", icon: "calendar" as const },
  { label: "Referrals & finance", icon: "coins" as const },
];

function BotanicalDecoration() {
  return (
    <svg
      viewBox="0 0 420 300"
      fill="none"
      className="pointer-events-none absolute -right-8 top-0 hidden h-full w-[420px] opacity-80 lg:block"
      aria-hidden="true"
    >
      <circle cx="245" cy="260" r="170" fill="#E9EBDD" opacity=".55" />
      <path
        d="M238 242C286 162 337 98 417 39"
        stroke="#536B48"
        strokeWidth="2"
      />
      <path
        d="M303 164C259 135 246 104 257 72C291 86 311 119 303 164Z"
        fill="#73875B"
      />
      <path
        d="M310 157C318 104 354 69 405 61C398 111 365 145 310 157Z"
        fill="#526E48"
      />
      <path
        d="M352 111C347 75 362 42 392 20C407 55 393 88 352 111Z"
        fill="#87976A"
      />
      <path
        d="M259 216C216 195 194 165 197 129C236 145 260 177 259 216Z"
        fill="#647C50"
      />
      <path
        d="M264 211C279 171 310 149 349 149C333 186 302 207 264 211Z"
        fill="#84936A"
      />
      <path
        d="M214 258C177 242 158 213 160 181C194 193 215 220 214 258Z"
        fill="#84936A"
      />
    </svg>
  );
}

async function OperationsDashboardContent() {
  await connection();
  await requireAnyRole(["admin"]);

  return (
    <main className="min-h-screen bg-[#F8F6F0] text-[#1F2D25] lg:flex">
      {/* Sidebar */}
      <aside className="relative flex w-full shrink-0 flex-col overflow-hidden bg-[#0D3024] text-[#F6F4EB] lg:sticky lg:top-0 lg:h-screen lg:w-[275px]">
        <div className="pointer-events-none absolute -bottom-8 -left-12 opacity-30">
          <svg
            viewBox="0 0 220 250"
            className="h-64 w-56"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M-10 245C60 175 91 100 126 15"
              stroke="#B7C8A2"
              strokeWidth="2"
            />
            <path
              d="M34 187C-1 166-8 135 1 105C34 120 48 151 34 187Z"
              fill="#9BAF82"
            />
            <path
              d="M48 160C49 116 75 83 111 70C111 113 86 145 48 160Z"
              fill="#A7B98B"
            />
            <path
              d="M-1 230C-13 196-1 165 25 143C43 179 31 210-1 230Z"
              fill="#718C68"
            />
            <path
              d="M82 100C68 66 78 35 104 12C124 46 114 79 82 100Z"
              fill="#A7B98B"
            />
          </svg>
        </div>

        <div className="relative flex items-center gap-3 px-6 py-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8F6F0] font-serif text-2xl font-semibold text-[#174333]">
            A
          </span>
          <span className="font-serif text-[27px] font-semibold tracking-tight">
            Apronly
          </span>
        </div>

        <div className="relative px-5 pt-7">
          <p className="mb-4 px-4 text-xs font-medium tracking-[0.2em] text-[#B8C8B9]">
            OPERATIONS
          </p>

          <nav className="space-y-1.5" aria-label="Operations navigation">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 text-[14px] font-medium transition ${
                  item.active
                    ? "bg-[#496D58] text-white shadow-sm"
                    : "text-[#E1E9E0] hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon name={item.icon} className="h-[22px] w-[22px]" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="my-5 border-t border-[#6C8977]/60" />

          <nav className="space-y-1.5" aria-label="Future operations">
            {futureNavigation.map((item) => (
              <div
                key={item.label}
                aria-disabled="true"
                title="Not implemented"
                className="flex cursor-not-allowed items-center gap-4 rounded-xl px-4 py-3 text-[13px] text-[#B5C6B9]"
              >
                <Icon name={item.icon} className="h-[22px] w-[22px] opacity-75" />
                {item.label}
              </div>
            ))}
          </nav>
        </div>

        <div className="relative mt-auto hidden px-6 pb-7 pt-10 text-[10px] tracking-[0.16em] text-[#8FA797] lg:block">
          APRONLY · PEOPLE OPERATIONS
        </div>
      </aside>

      {/* Main workspace */}
      <div className="min-w-0 flex-1">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-[#E5E2D8] bg-[#FBFAF6] px-5 sm:px-8 lg:px-12">
          <span className="text-sm text-[#606B62]">
            Operations workspace
          </span>

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

        {/* Hero */}
        <section className="relative flex min-h-[255px] items-center overflow-hidden border-b border-[#E8E5DC] px-6 py-12 sm:px-10 lg:px-12">
          <BotanicalDecoration />

          <div className="relative z-10 max-w-[620px]">
            <p className="text-xs font-semibold tracking-[0.19em] text-[#24583B]">
              APRONLY OPERATIONS
            </p>

            <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight text-[#1F2923] sm:text-5xl lg:text-[52px]">
              Operations overview
            </h1>

            <p className="mt-4 max-w-[590px] text-sm leading-[1.8] text-[#62675F] sm:text-base">
              Manage the recruitment lifecycle across candidates, restaurant
              partners and hiring operations. This workspace is the central
              control point for Apronly&apos;s managed recruitment service.
            </p>
          </div>
        </section>

        {/* Operational workspaces */}
        <div className="px-5 pb-8 pt-8 sm:px-8 lg:px-10 lg:pt-9">
          <section>
            <div className="mb-6">
              <h2 className="font-serif text-[27px] font-medium tracking-tight text-[#202A23]">
                Operational workspaces
              </h2>
              <p className="mt-1 text-sm text-[#747970]">
                Operational modules and their implementation status.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {operationalAreas.map((area) => {
                const content = (
                  <>
                    <div className="flex items-start gap-4">
                      <span className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full bg-[#E8ECD9] text-[#174C34]">
                        <Icon name={area.icon} className="h-8 w-8" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold tracking-[0.16em] text-[#24583B]">
                          {area.category}
                        </p>
                        <h3 className="mt-1 font-serif text-[19px] font-semibold leading-tight text-[#1E2922]">
                          {area.title}
                        </h3>
                        <p className="mt-2 text-[13px] leading-[1.55] text-[#62675F]">
                          {area.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium ${
                          area.status === "Not implemented"
                            ? "bg-[#EEE8D9] text-[#74684E]"
                            : "bg-[#E8EEDB] text-[#244B31]"
                        }`}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            area.status === "Not implemented"
                              ? "bg-[#BDA675]"
                              : "bg-[#77965B]"
                          }`}
                        />
                        {area.status}
                      </span>

                      {area.href && (
                        <span className="text-xl text-[#174C34] transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      )}
                    </div>
                  </>
                );

                return area.href ? (
                  <Link
                    key={area.title}
                    href={area.href}
                    className="group flex min-h-[182px] flex-col justify-between rounded-2xl border border-[#DEDCD1] bg-[#FCFBF7] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#B9C8B7] hover:shadow-[0_8px_24px_rgba(25,52,36,0.06)]"
                  >
                    {content}
                  </Link>
                ) : (
                  <article
                    key={area.title}
                    className="flex min-h-[182px] flex-col justify-between rounded-2xl border border-[#DEDCD1] bg-[#FCFBF7] p-5"
                  >
                    {content}
                  </article>
                );
              })}
            </div>
          </section>

          {/* Recruitment pipeline banner */}
          <section className="mt-9 flex flex-col gap-5 rounded-2xl bg-[#EAEDE0] p-6 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-5">
            <div className="flex items-center gap-5">
              <span className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-full bg-[#DDE5CE] text-[#24583B]">
                <Icon name="chart" className="h-8 w-8" />
              </span>

              <div>
                <h2 className="font-serif text-2xl font-semibold text-[#202A23]">
                  Recruitment pipeline
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#626B60]">
                  Track accepted invitations through contact, consent,
                  interviews and placement.
                </p>
              </div>
            </div>

            <Link
              href="/ops/recruitment-pipeline"
              className="inline-flex shrink-0 items-center justify-center gap-4 rounded-xl bg-[#06452E] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-[#0C3929]"
            >
              Open recruitment pipeline
              <span aria-hidden="true" className="text-lg">
                →
              </span>
            </Link>
          </section>

          <footer className="mt-8 border-t border-[#DEDCD1] px-2 py-5 text-xs text-[#777D74]">
            Apronly · Internal recruitment operations.
          </footer>
        </div>
      </div>
    </main>
  );
}

export default function OperationsDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F8F6F0] p-8">
          <p className="text-sm text-[#747970]">
            Loading operations workspace...
          </p>
        </main>
      }
    >
      <OperationsDashboardContent />
    </Suspense>
  );
}
