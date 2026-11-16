
import Link from "next/link";

type ActiveSection =
  | "overview"
  | "candidates"
  | "restaurants"
  | "hiring"
  | "pipeline";

type IconName =
  | "home"
  | "users"
  | "store"
  | "document"
  | "chart"
  | "search"
  | "calendar"
  | "coins";

function SidebarIcon({
  name,
}: {
  name: IconName;
}) {
  const common = {
    className: "h-[22px] w-[22px] shrink-0",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  const icons: Record<IconName, React.ReactNode> = {
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

  return <svg {...common}>{icons[name]}</svg>;
}

const mainNavigation: {
  label: string;
  href: string;
  icon: IconName;
  section: ActiveSection;
}[] = [
  {
    label: "Overview",
    href: "/ops",
    icon: "home",
    section: "overview",
  },
  {
    label: "Candidates",
    href: "/ops/candidates",
    icon: "users",
    section: "candidates",
  },
  {
    label: "Restaurants",
    href: "/ops/restaurants",
    icon: "store",
    section: "restaurants",
  },
  {
    label: "Hiring approvals",
    href: "/ops/hiring",
    icon: "document",
    section: "hiring",
  },
  {
    label: "Recruitment pipeline",
    href: "/ops/recruitment-pipeline",
    icon: "chart",
    section: "pipeline",
  },
];

const futureNavigation: {
  label: string;
  icon: IconName;
}[] = [
  { label: "Screening & shortlisting", icon: "search" },
  { label: "Interviews & placements", icon: "calendar" },
  { label: "Referrals & finance", icon: "coins" },
];

function BotanicalDecoration() {
  return (
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
  );
}

export default function OperationsSidebar({
  active,
}: {
  active: ActiveSection;
}) {
  return (
    <aside className="relative flex w-full shrink-0 flex-col overflow-hidden bg-[#0D3024] text-[#F6F4EB] lg:sticky lg:top-0 lg:h-screen lg:w-[275px]">
      <div className="pointer-events-none absolute -bottom-8 -left-12 opacity-30">
        <BotanicalDecoration />
      </div>

      <Link
        href="/ops"
        className="relative flex items-center gap-3 px-6 py-7"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8F6F0] font-serif text-2xl font-semibold text-[#174333]">
          A
        </span>
        <span className="font-serif text-[27px] font-semibold tracking-tight">
          Apronly
        </span>
      </Link>

      <div className="relative px-5 pt-7">
        <p className="mb-4 px-4 text-xs font-medium tracking-[0.2em] text-[#B8C8B9]">
          OPERATIONS
        </p>

        <nav className="space-y-1.5" aria-label="Operations navigation">
          {mainNavigation.map((item) => {
            const isActive = active === item.section;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 text-[14px] font-medium transition ${
                  isActive
                    ? "bg-[#496D58] text-white shadow-sm"
                    : "text-[#E1E9E0] hover:bg-white/10 hover:text-white"
                }`}
              >
                <SidebarIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
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
              <SidebarIcon name={item.icon} />
              {item.label}
            </div>
          ))}
        </nav>
      </div>

      <div className="relative mt-auto hidden px-6 pb-7 pt-10 text-[10px] tracking-[0.16em] text-[#8FA797] lg:block">
        APRONLY · PEOPLE OPERATIONS
      </div>
    </aside>
  );
}
