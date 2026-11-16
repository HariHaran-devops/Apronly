import Link from "next/link";
import Image from "next/image";

const benefits = [
  { symbol: "↗", title: "Faster hiring" },
  { symbol: "◇", title: "People-first profiles" },
  { symbol: "✳", title: "Built for hospitality" },
];

const darkButtonStyle = { color: "#FFFFFF" };
const lightButtonStyle = { color: "#22221F" };

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#faf5ec] text-[#22221f]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#e9dfd2] bg-[#faf5ec]/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <Link
            href="/"
            aria-label="Apronly home"
            className="flex shrink-0 items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#20211f] text-lg font-bold text-white">
              A
            </span>
            <span className="text-[22px] font-semibold tracking-[-0.04em]">
              Apronly
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#bdb5a9] px-4 text-[13px] font-semibold transition-colors hover:bg-white"
              style={lightButtonStyle}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#20211f] px-4 text-[13px] font-semibold transition-colors hover:bg-[#41423e] sm:px-5"
              style={darkButtonStyle}
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute -right-28 top-2 h-[360px] w-[360px] rounded-full bg-[#f5dfd0] sm:h-[430px] sm:w-[430px]" />

        <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[0.98fr_1.02fr] lg:gap-10 lg:px-12 lg:py-[76px]">
          <div className="relative z-10 min-w-0">
            <div className="mb-7 flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.17em] text-[#62635c] sm:text-xs">
              <span className="h-[3px] w-12 shrink-0 bg-[#d9a54e]" />
              Hospitality talent, simplified
            </div>

            <h1 className="max-w-[680px] font-serif text-[clamp(3.15rem,5.3vw,5.35rem)] font-medium leading-[0.99] tracking-[-0.045em]">
              Connect talented
              <br />
              professionals with
              <br />
              <span className="italic text-[#c9654e]">
                great restaurants
              </span>
            </h1>

            <div className="ml-8 mt-3 h-[3px] w-48 rotate-[-2deg] bg-[#e3b75f] sm:w-60" />

            <p className="mt-7 max-w-[550px] text-[15px] leading-[1.8] text-[#696a63] sm:text-base">
              Apronly is the hospitality hiring platform that helps
              candidates find the right opportunities and restaurants
              hire reliable, skilled talent — faster and easier.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/register?type=candidate"
                className="group inline-flex min-h-[76px] w-full items-center gap-4 rounded-2xl bg-[#20211f] px-6 shadow-[0_10px_24px_rgba(32,33,31,0.13)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#393a36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9654e] sm:w-[260px] sm:px-5"
                style={darkButtonStyle}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-8 w-8 shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="7" r="4" />
                  <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                </svg>
                <span className="min-w-0 text-left">
                  <span className="block text-base font-bold">
                    I&apos;m a Candidate
                  </span>
                  <span className="mt-0.5 block text-sm text-white/80">
                    Find hospitality jobs
                  </span>
                </span>
                <span
                  className="ml-auto text-lg transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>

              <Link
                href="/register?type=restaurant"
                className="group inline-flex min-h-[76px] w-full items-center gap-4 rounded-2xl border border-[#bdb5a9] bg-white/60 px-6 transition duration-200 hover:-translate-y-0.5 hover:border-[#20211f] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9654e] sm:w-[260px] sm:px-5"
                style={lightButtonStyle}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-8 w-8 shrink-0"
                  aria-hidden="true"
                >
                  <path d="M3 10h18" />
                  <path d="M5 10v10h14V10" />
                  <path d="M3 10l2-6h14l2 6" />
                  <path d="M9 20v-6h6v6" />
                </svg>
                <span className="min-w-0 text-left">
                  <span className="block text-base font-bold">
                    I&apos;m a Restaurant
                  </span>
                  <span className="mt-0.5 block text-sm text-[#686961]">
                    Hire great talent
                  </span>
                </span>
                <span
                  className="ml-auto text-lg transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            </div>

            <div className="mt-9 grid grid-cols-1 gap-3 border-t border-[#e4d9cc] pt-5 sm:grid-cols-3 sm:gap-4">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex items-center gap-2.5">
                  <span
                    className="text-xl leading-none text-[#c9654e]"
                    aria-hidden="true"
                  >
                    {benefit.symbol}
                  </span>
                  <span className="text-[12px] font-semibold text-[#4d4e48] sm:text-[11px] xl:text-xs">
                    {benefit.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Existing hero image — unchanged */}
          <div className="relative z-10 mx-auto w-full max-w-[700px] lg:ml-auto">
            <div className="relative h-[340px] overflow-hidden rounded-[30px] border border-[#e7dfd5] bg-[#f1ebe2] shadow-[0_24px_60px_rgba(62,48,33,0.12)] sm:h-[440px] sm:rounded-[38px] lg:h-[520px]">
              <Image
                src="/apronly-hero.png"
                alt="Apronly hospitality professional in a restaurant"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 52vw"
                className="object-cover object-center"
              />
            </div>
            <div className="pointer-events-none absolute -bottom-5 -left-5 -z-10 h-24 w-24 rounded-full bg-[#edcfbc] sm:h-28 sm:w-28" />
          </div>
        </div>
      </section>

      {/* Minimal footer */}
      <footer className="border-t border-[#e8ded2]">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-5 px-5 py-8 text-xs text-[#77766e] sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-[#20211f]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#20211f] text-[10px] text-white">
              A
            </span>
            Apronly
          </Link>
          <p>Connecting hospitality talent with opportunity.</p>
          <div className="flex flex-wrap gap-5">
            <Link
              href="/terms"
              className="transition-colors hover:text-[#20211f]"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="transition-colors hover:text-[#20211f]"
            >
              Privacy
            </Link>
            <Link
              href="/login"
              className="transition-colors hover:text-[#20211f]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
