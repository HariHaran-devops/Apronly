
"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type CandidateWorkspaceShellProps = {
  fullName: string;
  children: ReactNode;
  opportunityCount?: number;
};

const navigation = [
  { label: "Overview", href: "/app", icon: "grid" },
  {
    label: "Opportunities",
    href: "/app/opportunities",
    icon: "briefcase",
    count: true,
  },
  { label: "My profile", href: "/app/profile", icon: "user" },
] as const;

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 21,
    height: 21,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );

    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="14" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M3 12h18" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );

    case "sliders":
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h16" />
          <circle cx="8" cy="6" r="2" fill="#fffdf8" />
          <circle cx="16" cy="12" r="2" fill="#fffdf8" />
          <circle cx="10" cy="18" r="2" fill="#fffdf8" />
        </svg>
      );

    case "file":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M8 13h8M8 17h8" />
        </svg>
      );

    case "help":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.6 9a2.5 2.5 0 1 1 4.6 1.3c-.8 1-2.2 1.3-2.2 3M12 17h.01" />
        </svg>
      );

    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    default:
      return null;
  }
}

function BrandMark() {
  return (
    <svg
      width="33"
      height="29"
      viewBox="0 0 34 30"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16.8 14.8C12.2 5.9 5.7 4.7 1.7 5.1c-.3 8.4 4.2 14.7 15.1 15.1"
        fill="#07552f"
      />
      <path
        d="M17.2 14.8C21.8 5.9 28.3 4.7 32.3 5.1c.3 8.4-4.2 14.7-15.1 15.1"
        fill="#07552f"
      />
      <path
        d="M17 15v13"
        stroke="#07552f"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "C"
  );
}

export default function CandidateWorkspaceShell({
  fullName,
  children,
  opportunityCount = 0,
}: CandidateWorkspaceShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Current route controls the active sidebar item.
  const activeItem = pathname.startsWith("/app/opportunities")
    ? "Opportunities"
    : pathname.startsWith("/app/profile")
      ? "My profile"
      : pathname.startsWith("/app")
        ? "Overview"
        : pathname.startsWith("/onboarding/candidate")
          ? "My profile"
          : "";

  return (
    <div className="min-h-screen bg-[#fbf9f3] text-[#17251c]">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-[#14271b]/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[254px] flex-col overflow-hidden border-r border-[#e9e3d9] bg-[#fffdf8]",
          "transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="mx-[30px] flex h-[70px] shrink-0 items-center gap-2.5 border-b border-[#e8e3d8]">
          <BrandMark />
          <Link
            href="/app"
            onClick={() => setMobileOpen(false)}
            className="font-serif text-[30px] font-bold tracking-[-1.5px] text-[#07512e]"
          >
            Apronly
          </Link>
        </div>

        {/* Main navigation */}
        <div className="px-4 pt-6">
          <p className="mb-4 px-3 text-[11px] font-bold tracking-[0.15em] text-[#62675f]">
            CANDIDATE WORKSPACE
          </p>

          <nav aria-label="Candidate navigation" className="space-y-1.5">
            {navigation.map((item) => {
              const isActive = activeItem === item.label;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "flex min-h-[49px] items-center gap-4 rounded-[12px] px-4 text-[14px] font-semibold transition-colors",
                    isActive
                      ? "bg-[#e8eddf] text-[#14291b]"
                      : "text-[#202820] hover:bg-[#f1f2eb]",
                  ].join(" ")}
                >
                  <span
                    className={
                      isActive ? "text-[#07552f]" : "text-[#28362d]"
                    }
                  >
                    <NavIcon name={item.icon} />
                  </span>

                  <span className="flex-1">{item.label}</span>

                  {"count" in item && item.count && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#b8d2b1] px-1.5 text-[11px] font-bold text-[#173b24]">
                      {opportunityCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="my-5 border-t border-[#e9e3d9]" />

          <a
            href="/app#help"
            onClick={() => setMobileOpen(false)}
            className="flex min-h-[48px] items-center gap-4 rounded-[12px] px-4 text-[14px] font-semibold text-[#202820] transition hover:bg-[#f1f2eb]"
          >
            <span className="text-[#28362d]">
              <NavIcon name="help" />
            </span>
            Help &amp; support
          </a>
        </div>

        {/* Bottom landscape and brand footer */}
        <div className="mt-auto">
          <div
            className="h-[108px] w-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/images/candidate-hero.jpg')",
            }}
            aria-hidden="true"
          />

          <div className="min-h-[169px] bg-[#fffdf8] px-10 pt-6">
            <div
              className="text-[24px] leading-none text-[#174c2e]"
              aria-hidden="true"
            >
              ♜
            </div>

            <p className="mt-2 font-serif text-[20px] font-bold text-[#17251c]">
              Apronly
            </p>

            <p className="mt-0.5 max-w-[155px] text-[13px] leading-[1.35] text-[#5e665e]">
              Hospitality careers, thoughtfully connected.
            </p>
          </div>
        </div>
      </aside>

      {/* Main workspace */}
      <div className="min-h-screen lg:ml-[254px]">
        {/* Top navigation */}
        <header className="sticky top-0 z-30 flex h-[54px] items-center justify-between border-b border-[#e8e3d8] bg-[#fffdf8]/95 px-5 backdrop-blur sm:px-7">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#244b31] hover:bg-[#edf1e8] lg:hidden"
            >
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <span className="text-[14px] font-bold text-[#1b211d]">
              Candidate Workspace
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#07552f] hover:bg-[#edf1e8]"
            >
              <NavIcon name="bell" />
              <span className="absolute right-[6px] top-[5px] h-2 w-2 rounded-full bg-[#17683c] ring-2 ring-[#fffdf8]" />
            </button>

            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-full px-1 py-1 hover:bg-[#f1f0e9]">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#07552f] text-[14px] font-bold text-white">
                  {getInitials(fullName)}
                </span>

                <span className="hidden max-w-[145px] truncate text-[13px] font-semibold text-[#202820] sm:block">
                  {fullName}
                </span>

                <svg
                  className="hidden h-4 w-4 text-[#202820] sm:block"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="m5 7 5 5 5-5" />
                </svg>
              </summary>

              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-[#e8e3d8] bg-white p-2 shadow-lg">
                <Link
                  href="/app/profile"
                  className="block rounded-lg px-3 py-2.5 text-sm hover:bg-[#f2f4ed]"
                >
                  Edit profile
                </Link>

                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-[#8a5146] hover:bg-[#f8efeb]"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </details>

            <form action="/auth/signout" method="post" className="hidden sm:block">
              <button
                type="submit"
                className="rounded-[9px] border border-[#d9d4c9] bg-white/50 px-4 py-2 text-[12px] font-semibold text-[#202820] hover:bg-[#f3f0e8]"
              >
                Sign Out
              </button>
            </form>
          </div>
        </header>

        <div id="overview">{children}</div>
      </div>
    </div>
  );
}
