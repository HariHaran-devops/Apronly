
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type AccountType = "candidate" | "restaurant";

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("candidate");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    const normalizedName = fullName.trim().replace(/\s+/g, " ");
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 2 || normalizedName.length > 150) {
      setError("Enter a name between 2 and 150 characters.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedName,
            onboarding_type: accountType,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/complete`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      console.log("APRONLY AUTH DEBUG", {
        userCreated: !!data.user,
        userId: data.user?.id,
        sessionCreated: !!data.session,
        emailConfirmed: !!data.user?.email_confirmed_at,
      });

      if (data.session) {
        router.replace("/auth/complete");
        return;
      }

      setError(
        `DEBUG: User=${!!data.user}, Session=${!!data.session}, Confirmed=${!!data.user?.email_confirmed_at}`
      );
      return;
    } catch (error) {
      console.error("Registration error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:px-8">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center">
        <Link
          href="/"
          className="mb-10 inline-flex w-fit items-center gap-2 text-xl font-semibold tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm text-white">
            A
          </span>
          Apronly
        </Link>

        {success ? (
          <section
            className="rounded-3xl border border-border bg-surface p-7 shadow-sm sm:p-9"
            aria-live="polite"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-muted text-2xl">
              ✉
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Check your email
            </h1>

            <p className="mt-3 text-sm leading-6 text-muted">
              We have sent a confirmation link to{" "}
              <strong className="break-all text-foreground">
                {email}
              </strong>
              . Open that email to verify your address and continue setting
              up your Apronly account.
            </p>

            <p className="mt-5 text-sm text-muted">
              If you don&apos;t see it, check your spam folder.
            </p>

            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setError("");
              }}
              className="mt-7 w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Back to registration
            </button>
          </section>
        ) : (
          <>
            <div className="mb-8">
              <p className="mb-3 text-sm font-medium text-sage">
                YOUR NEXT CHAPTER STARTS HERE
              </p>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Create your account
              </h1>

              <p className="mt-3 text-sm leading-6 text-muted">
                Join Apronly to discover opportunities or find the right
                hospitality talent.
              </p>
            </div>

            <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <fieldset disabled={loading}>
                  <legend className="mb-3 text-sm font-medium">
                    How will you use Apronly?
                  </legend>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAccountType("candidate")}
                      aria-pressed={accountType === "candidate"}
                      className={`rounded-2xl border p-4 text-left transition ${
                        accountType === "candidate"
                          ? "border-primary bg-surface-muted ring-1 ring-primary"
                          : "border-border hover:border-muted"
                      }`}
                    >
                      <span
                        className="mb-3 block text-xl"
                        aria-hidden="true"
                      >
                        👤
                      </span>

                      <span className="block text-sm font-semibold">
                        Find a job
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-muted">
                        I&apos;m looking for opportunities
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountType("restaurant")}
                      aria-pressed={accountType === "restaurant"}
                      className={`rounded-2xl border p-4 text-left transition ${
                        accountType === "restaurant"
                          ? "border-primary bg-surface-muted ring-1 ring-primary"
                          : "border-border hover:border-muted"
                      }`}
                    >
                      <span
                        className="mb-3 block text-xl"
                        aria-hidden="true"
                      >
                        🏢
                      </span>

                      <span className="block text-sm font-semibold">
                        Hire talent
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-muted">
                        I&apos;m hiring for a business
                      </span>
                    </button>
                  </div>
                </fieldset>

                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-medium"
                  >
                    Full name
                  </label>

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={150}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Enter your full name"
                    disabled={loading}
                    className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    disabled={loading}
                    className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      disabled={loading}
                      className="w-full rounded-xl border border-border bg-white px-4 py-3 pr-16 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      disabled={loading}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute inset-y-0 right-3 text-xs font-medium text-muted hover:text-foreground"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-medium"
                  >
                    Confirm password
                  </label>

                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Enter your password again"
                      disabled={loading}
                      className="w-full rounded-xl border border-border bg-white px-4 py-3 pr-16 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((value) => !value)
                      }
                      disabled={loading}
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      className="absolute inset-y-0 right-3 text-xs font-medium text-muted hover:text-foreground"
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Creating your account..." : "Create account"}
                </button>

                <p className="text-center text-xs leading-5 text-muted">
                  By continuing, you agree to Apronly&apos;s{" "}
                  <Link
                    href="/terms"
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </form>
            </section>

            <p className="mt-7 text-center text-sm text-muted">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-foreground underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
