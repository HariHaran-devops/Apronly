
$ErrorActionPreference = "Stop"

$directories = @(
    # Public website
    "src/app/(public)/about",
    "src/app/(public)/how-it-works",
    "src/app/(public)/jobs",
    "src/app/(public)/jobs/[jobId]",
    "src/app/(public)/restaurants",
    "src/app/(public)/referrals",
    "src/app/(public)/contact",
    "src/app/(public)/faq",
    "src/app/(public)/privacy",
    "src/app/(public)/terms",

    # Authentication
    "src/app/(auth)/login",
    "src/app/(auth)/register",
    "src/app/(auth)/verify",

    # Candidate portal
    "src/app/app/dashboard",
    "src/app/app/profile",
    "src/app/app/jobs",
    "src/app/app/applications",
    "src/app/app/referrals",
    "src/app/app/settings",

    # Restaurant portal
    "src/app/partner/dashboard",
    "src/app/partner/profile",
    "src/app/partner/requirements",
    "src/app/partner/candidates",
    "src/app/partner/placements",
    "src/app/partner/settings",

    # Admin platform
    "src/app/ops/dashboard",
    "src/app/ops/candidates",
    "src/app/ops/restaurants",
    "src/app/ops/requirements",
    "src/app/ops/applications",
    "src/app/ops/placements",
    "src/app/ops/finance",
    "src/app/ops/referrals",
    "src/app/ops/reports",
    "src/app/ops/settings",

    # API
    "src/app/api/auth",
    "src/app/api/candidates",
    "src/app/api/restaurants",
    "src/app/api/requirements",
    "src/app/api/applications",
    "src/app/api/placements",
    "src/app/api/referrals",

    # Components
    "src/components/ui",
    "src/components/layout",
    "src/components/forms",
    "src/components/shared",
    "src/components/public",
    "src/components/candidate",
    "src/components/restaurant",
    "src/components/admin",

    # Business logic modules
    "src/modules/auth/schemas",
    "src/modules/auth/services",
    "src/modules/candidates/schemas",
    "src/modules/candidates/services",
    "src/modules/restaurants/schemas",
    "src/modules/restaurants/services",
    "src/modules/requirements/schemas",
    "src/modules/requirements/services",
    "src/modules/applications/schemas",
    "src/modules/applications/services",
    "src/modules/matching/services",
    "src/modules/placements/services",
    "src/modules/finance/services",
    "src/modules/referrals/services",
    "src/modules/ratings/services",
    "src/modules/communications/services",

    # Infrastructure and shared code
    "src/lib/supabase",
    "src/lib/permissions",
    "src/lib/validation",
    "src/lib/notifications",
    "src/config",
    "src/types",

    # Database
    "supabase/migrations",
    "supabase/seed",

    # Documentation
    "docs/product",
    "docs/architecture",
    "docs/api",

    # Scripts
    "scripts"
)

foreach ($directory in $directories) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
}

@"
# Apronly Environment Variables

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
"@ | Set-Content -Path ".env.example" -Encoding UTF8

@"
# Apronly Project Structure

- src/app: Next.js routes and API endpoints
- src/components: Reusable UI components
- src/modules: Business domains and application logic
- src/lib: Shared infrastructure and utilities
- src/config: Application configuration
- src/types: Shared TypeScript types
- supabase: Database migrations and seed data
- docs: Product, architecture and API documentation
- scripts: Development and maintenance scripts

Keep business logic inside modules rather than placing it directly
inside page components or API route handlers.
"@ | Set-Content -Path "docs/architecture/PROJECT_STRUCTURE.md" -Encoding UTF8

Write-Host "`nApronly folder structure created successfully." -ForegroundColor Green
