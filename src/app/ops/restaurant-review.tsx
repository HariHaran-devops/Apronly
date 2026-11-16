
"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface RestaurantOutlet {
  id: string;
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
}

export interface RestaurantApplication {
  id: string;
  name: string;
  legal_name: string | null;
  slug: string;
  description: string | null;
  city: string;
  business_email: string | null;
  business_phone: string | null;
  website_url: string | null;
  category: string | null;
  status: string;
  verification_status: string;
  review_status: string;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  outlets: RestaurantOutlet[];
}

interface RestaurantReviewProps {
  applications: RestaurantApplication[];
  loadError?: string | null;
}

type ReviewDecision = "approved" | "rejected" | "changes_requested";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[11px] font-bold uppercase tracking-[0.13em] text-[#788278]">
        {label}
      </p>
      <div className="mt-1.5 break-words font-sans text-sm font-medium leading-6 text-[#26352D]">
        {children || "Not provided"}
      </div>
    </div>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E9D9B8] bg-[#FBF5E9] px-3 py-1.5 font-sans text-xs font-semibold text-[#94713D]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#B78B48]" />
      {children}
    </span>
  );
}

function RestaurantApplicationDetails({
  application,
  onBack,
  showBackButton,
}: {
  application: RestaurantApplication;
  onBack: () => void;
  showBackButton: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  const primaryOutlet =
    application.outlets?.find((outlet) => outlet.is_primary) ??
    application.outlets?.[0];

  const outletAddress = primaryOutlet
    ? [
        primaryOutlet.address_line1,
        primaryOutlet.address_line2,
        primaryOutlet.landmark,
        primaryOutlet.city,
        primaryOutlet.state,
        primaryOutlet.postal_code,
        primaryOutlet.country,
      ]
        .filter(Boolean)
        .join(", ")
    : "No outlet information available";

  async function review(decision: ReviewDecision) {
    const trimmedNote = note.trim();

    if (
      (decision === "rejected" || decision === "changes_requested") &&
      trimmedNote.length < 10
    ) {
      setError("Please provide a reason of at least 10 characters.");
      return;
    }

    const confirmed = window.confirm(
      decision === "approved"
        ? `Approve and verify ${application.name}? This enables its recruitment workspace.`
        : decision === "rejected"
          ? `Reject the application from ${application.name}?`
          : `Request changes from ${application.name}?`,
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");

    try {
      const supabase = createClient();

      const { error: reviewError } = await supabase.rpc(
        "review_restaurant_application",
        {
          p_restaurant_id: application.id,
          p_decision: decision,
          p_review_note: trimmedNote || null,
        },
      );

      if (reviewError) throw reviewError;

      router.refresh();
    } catch (err) {
      console.error("Restaurant application review failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit the review. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#FFFEFB]">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="border-b border-[#EAE5DB] px-5 py-6 sm:px-7">
          {showBackButton && (
            <button
              type="button"
              onClick={onBack}
              className="mb-5 inline-flex items-center gap-2 font-sans text-sm font-semibold text-[#657568] hover:text-[#183D30] lg:hidden"
            >
              <span aria-hidden="true">←</span>
              Back to applications
            </button>
          )}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-[#788A70]">
                {application.category || "Restaurant"} · {application.city}
              </p>
              <h3 className="mt-2 font-serif text-3xl leading-tight tracking-[-0.025em] text-[#20372B] sm:text-4xl">
                {application.name}
              </h3>
              <p className="mt-2 font-sans text-sm text-[#85877E]">
                Submitted {formatDate(application.created_at)}
              </p>
            </div>
            <StatusPill>Pending verification</StatusPill>
          </div>
        </div>

        <div className="space-y-8 px-5 py-7 sm:px-7">
          <section>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-6 w-1 rounded-full bg-[#839477]" />
              <h4 className="font-serif text-2xl text-[#26382D]">
                Business information
              </h4>
            </div>

            <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              <Detail label="Legal business name">
                {application.legal_name}
              </Detail>
              <Detail label="Business category">
                {application.category}
              </Detail>
              <Detail label="Business email">
                {application.business_email}
              </Detail>
              <Detail label="Business phone">
                {application.business_phone}
              </Detail>
              <Detail label="Website">
                {application.website_url ? (
                  <a
                    href={application.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-[#587451] underline decoration-[#B9C5B1] underline-offset-4 hover:text-[#294B34]"
                  >
                    {application.website_url}
                  </a>
                ) : (
                  "Not provided"
                )}
              </Detail>
              <Detail label="Registered city">{application.city}</Detail>
            </div>

            {application.description && (
              <div className="mt-6 border-t border-[#EEE9E0] pt-5">
                <Detail label="Business description">
                  <p className="whitespace-pre-wrap">
                    {application.description}
                  </p>
                </Detail>
              </div>
            )}
          </section>

          <section className="border-t border-[#EAE5DB] pt-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-6 w-1 rounded-full bg-[#839477]" />
                <h4 className="font-serif text-2xl text-[#26382D]">
                  Outlet information
                </h4>
              </div>
              <span className="rounded-full bg-[#F1F2EC] px-3 py-1.5 font-sans text-xs font-semibold text-[#657568]">
                {application.outlets?.length ?? 0} outlet(s)
              </span>
            </div>

            {primaryOutlet ? (
              <div className="rounded-2xl border border-[#E8E4DA] bg-[#FCFBF7] p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-serif text-xl text-[#26382D]">
                    {primaryOutlet.name}
                  </p>
                  <span className="rounded-full border border-[#DCE4D7] bg-[#F0F4ED] px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-[#587451]">
                    Primary outlet
                  </span>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Detail label="Outlet phone">{primaryOutlet.phone}</Detail>
                  <Detail label="Outlet email">{primaryOutlet.email}</Detail>
                  <div className="sm:col-span-2">
                    <Detail label="Complete address">
                      {outletAddress}
                    </Detail>
                  </div>
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-[#DED9CF] bg-[#FCFBF7] p-5 font-sans text-sm text-[#85877E]">
                No outlet information was found.
              </p>
            )}

            {application.outlets && application.outlets.length > 1 && (
              <div className="mt-5 space-y-3">
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.13em] text-[#788278]">
                  Additional outlets
                </p>
                {application.outlets
                  .filter((outlet) => !outlet.is_primary)
                  .map((outlet) => (
                    <div
                      key={outlet.id}
                      className="rounded-2xl border border-[#EAE5DB] p-4"
                    >
                      <p className="font-serif text-lg text-[#26382D]">
                        {outlet.name}
                      </p>
                      <p className="mt-2 font-sans text-sm leading-6 text-[#74796F]">
                        {[
                          outlet.address_line1,
                          outlet.address_line2,
                          outlet.city,
                          outlet.state,
                          outlet.postal_code,
                          outlet.country,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      <p className="mt-3 font-sans text-xs text-[#85877E]">
                        {outlet.phone || "No outlet phone provided"}
                        {outlet.email ? ` · ${outlet.email}` : ""}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </section>

          <section className="border-t border-[#EAE5DB] pt-6">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              className="flex w-full items-center justify-between text-left font-sans text-sm font-semibold text-[#435548] hover:text-[#183D30]"
            >
              Technical and system details
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E1D7] text-lg text-[#788278]">
                {expanded ? "−" : "+"}
              </span>
            </button>

            {expanded && (
              <div className="mt-4 grid gap-5 rounded-2xl bg-[#F5F4EE] p-5 sm:grid-cols-2">
                <Detail label="Application ID">
                  <span className="font-mono text-xs">{application.id}</span>
                </Detail>
                <Detail label="Restaurant slug">{application.slug}</Detail>
                <Detail label="Restaurant status">{application.status}</Detail>
                <Detail label="Verification status">
                  {application.verification_status}
                </Detail>
                <Detail label="Review status">{application.review_status}</Detail>
                <Detail label="Last review note">{application.review_note}</Detail>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="shrink-0 border-t border-[#EAE5DB] bg-[#FCFBF7] px-5 py-5 sm:px-7">
        <div className="mb-4">
          <h4 className="font-serif text-xl text-[#26382D]">
            Administrator review
          </h4>
          <p className="mt-1 font-sans text-xs leading-5 text-[#85877E]">
            A reason is required for rejection or change requests. Minimum 10
            characters.
          </p>
        </div>

        <textarea
          id={`restaurant-note-${application.id}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
          rows={2}
          disabled={busy}
          placeholder="Enter verification feedback or explain your decision..."
          className="w-full resize-y rounded-xl border border-[#E3DED3] bg-white px-4 py-3 font-sans text-sm leading-6 text-[#26352D] outline-none transition placeholder:text-[#A4A398] focus:border-[#829477] focus:ring-2 focus:ring-[#829477]/10 disabled:opacity-50"
        />

        <div className="mt-1 text-right font-sans text-xs text-[#929187]">
          {note.length}/2000
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void review("approved")}
            className="rounded-xl bg-[#173D30] px-3 py-3 font-sans text-sm font-semibold text-white shadow-sm transition hover:bg-[#24513E] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Processing..." : "Approve & verify"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void review("changes_requested")}
            className="rounded-xl border border-[#DCD8CD] bg-white px-3 py-3 font-sans text-sm font-semibold text-[#52634F] transition hover:border-[#AAB8A2] hover:bg-[#F4F5EF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Request changes
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void review("rejected")}
            className="rounded-xl border border-[#E8CECA] bg-white px-3 py-3 font-sans text-sm font-semibold text-[#A14F48] transition hover:bg-[#FBF1EF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject application
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantReview({
  applications,
  loadError,
}: RestaurantReviewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    applications[0]?.id ?? null,
  );
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"oldest" | "newest">("oldest");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const cities = useMemo(
    () =>
      Array.from(new Set(applications.map((item) => item.city).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b)),
    [applications],
  );

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applications
      .filter((application) => {
        const matchesSearch =
          !query ||
          application.name.toLowerCase().includes(query) ||
          application.city.toLowerCase().includes(query) ||
          application.id.toLowerCase().includes(query) ||
          (application.business_email ?? "").toLowerCase().includes(query);

        const matchesCity =
          cityFilter === "all" || application.city === cityFilter;

        return matchesSearch && matchesCity;
      })
      .sort((a, b) => {
        const difference =
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime();

        return sortOrder === "oldest" ? difference : -difference;
      });
  }, [applications, search, cityFilter, sortOrder]);

  const selectedApplication =
    filteredApplications.find((item) => item.id === selectedId) ??
    filteredApplications[0] ??
    null;

  function selectApplication(application: RestaurantApplication) {
    setSelectedId(application.id);
    setMobileDetailOpen(true);
  }

  return (
    <section className="mt-9">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.17em] text-[#788A70]">
            BUSINESS VERIFICATION
          </p>
          <h2 className="mt-2 font-serif text-3xl tracking-tight text-[#26382D] sm:text-4xl">
            Verification queue
          </h2>
          <p className="mt-2 max-w-xl font-sans text-sm leading-6 text-[#7C8177]">
            Review business details and verify restaurant partners.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="min-w-[145px] rounded-2xl border border-[#E8E3D9] bg-white px-4 py-3 shadow-[0_2px_10px_rgba(35,45,35,0.025)]">
            <p className="font-sans text-xs font-medium text-[#85877E]">
              Awaiting verification
            </p>
            <p className="mt-1 font-serif text-3xl leading-none tabular-nums text-[#26382D]">
              {applications.length}
            </p>
          </div>
          <div className="min-w-[125px] rounded-2xl border border-[#E8E3D9] bg-white px-4 py-3 shadow-[0_2px_10px_rgba(35,45,35,0.025)]">
            <p className="font-sans text-xs font-medium text-[#85877E]">
              Filtered results
            </p>
            <p className="mt-1 font-serif text-3xl leading-none tabular-nums text-[#26382D]">
              {filteredApplications.length}
            </p>
          </div>
        </div>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5 font-sans text-sm text-red-700"
        >
          Unable to load restaurant applications: {loadError}
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DED9CE] bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0F3EC] text-[#70836A]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M3 10h18M5 10V7l7-4 7 4v3M5 10v10h14V10M9 20v-6h6v6" />
            </svg>
          </div>
          <h3 className="mt-4 font-serif text-2xl text-[#26382D]">
            No pending restaurant applications
          </h3>
          <p className="mx-auto mt-2 max-w-md font-sans text-sm leading-6 text-[#85877E]">
            New restaurant applications will appear here when they are ready
            for verification.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E7E2D8] bg-white shadow-[0_5px_24px_rgba(37,45,35,0.035)]">
          <div className="grid min-h-[680px] lg:h-[min(780px,calc(100vh-190px))] lg:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.55fr)]">
            <aside
              className={`min-h-0 border-b border-[#EAE5DB] bg-[#FBFAF6] lg:border-b-0 lg:border-r ${
                mobileDetailOpen ? "hidden lg:flex" : "flex"
              } flex-col`}
            >
              <div className="shrink-0 space-y-4 border-b border-[#EAE5DB] p-4 sm:p-5">
                <div>
                  <h3 className="font-serif text-xl text-[#26382D]">
                    Application queue
                  </h3>
                  <p className="mt-1 font-sans text-xs leading-5 text-[#85877E]">
                    Select an application to inspect its details.
                  </p>
                </div>

                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[#92978C]">
                    ⌕
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, city or ID..."
                    aria-label="Search restaurant applications"
                    className="w-full rounded-xl border border-[#E4DFD5] bg-white py-3 pl-9 pr-3 font-sans text-sm outline-none transition placeholder:text-[#A5A397] focus:border-[#829477] focus:ring-2 focus:ring-[#829477]/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={cityFilter}
                    onChange={(event) => setCityFilter(event.target.value)}
                    aria-label="Filter by city"
                    className="min-w-0 rounded-xl border border-[#E4DFD5] bg-white px-3 py-2.5 font-sans text-xs text-[#536052] outline-none focus:border-[#829477]"
                  >
                    <option value="all">All cities</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sortOrder}
                    onChange={(event) =>
                      setSortOrder(event.target.value as "oldest" | "newest")
                    }
                    aria-label="Sort applications"
                    className="min-w-0 rounded-xl border border-[#E4DFD5] bg-white px-3 py-2.5 font-sans text-xs text-[#536052] outline-none focus:border-[#829477]"
                  >
                    <option value="oldest">Oldest first</option>
                    <option value="newest">Newest first</option>
                  </select>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {filteredApplications.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="font-sans text-sm font-semibold text-[#526052]">
                      No matching applications
                    </p>
                    <p className="mt-1 font-sans text-xs leading-5 text-[#85877E]">
                      Try another search term or city.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 p-2.5">
                    {filteredApplications.map((application) => {
                      const selected =
                        selectedApplication?.id === application.id;

                      return (
                        <button
                          key={application.id}
                          type="button"
                          onClick={() => selectApplication(application)}
                          aria-pressed={selected}
                          className={`w-full rounded-xl border p-3.5 text-left transition ${
                            selected
                              ? "border-[#C8D3C1] bg-[#F0F3EC] shadow-[inset_3px_0_0_#71866A]"
                              : "border-transparent hover:border-[#E8E3D9] hover:bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 truncate font-serif text-lg text-[#26382D]">
                              {application.name}
                            </p>
                            <span
                              className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                                selected ? "bg-[#71866A]" : "bg-[#B78B48]"
                              }`}
                            />
                          </div>

                          <p className="mt-1 font-sans text-xs text-[#7C8177]">
                            {application.category || "Restaurant"} ·{" "}
                            {application.city}
                          </p>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="font-sans text-[11px] text-[#929187]">
                              {formatDate(application.created_at)}
                            </span>
                            <span className="rounded-full bg-[#FBF5E9] px-2 py-1 font-sans text-[10px] font-semibold text-[#94713D]">
                              Pending
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-[#EAE5DB] px-4 py-3">
                <p className="font-sans text-xs text-[#85877E]">
                  Showing {filteredApplications.length} of {applications.length}{" "}
                  applications
                </p>
              </div>
            </aside>

            <div
              className={`min-h-0 min-w-0 ${
                mobileDetailOpen ? "flex" : "hidden lg:flex"
              } flex-col`}
            >
              {selectedApplication ? (
                <RestaurantApplicationDetails
                  key={selectedApplication.id}
                  application={selectedApplication}
                  onBack={() => setMobileDetailOpen(false)}
                  showBackButton
                />
              ) : (
                <div className="flex flex-1 items-center justify-center p-8 text-center">
                  <div>
                    <h3 className="font-serif text-2xl text-[#26382D]">
                      Select an application
                    </h3>
                    <p className="mt-2 font-sans text-sm leading-6 text-[#85877E]">
                      Choose a restaurant from the queue to review its details.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
