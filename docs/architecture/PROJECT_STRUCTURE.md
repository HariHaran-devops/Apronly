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
