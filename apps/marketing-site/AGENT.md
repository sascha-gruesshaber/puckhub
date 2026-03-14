# Marketing Site (`@puckhub/marketing-site`)

Public marketing landing page for PuckHub, served on the bare domain (`puckhub.eu` / `puckhub.localhost`).

## Purpose

- Showcases PuckHub features and pricing to prospective customers
- Displays pricing plans dynamically from the database via `publicSite.listPlans`
- Links visitors to the demo admin portal
- Hosts legal pages (Impressum, Datenschutz) required by German law

## Tech Stack

- **Framework:** TanStack Start (SSR for SEO)
- **Styling:** Tailwind CSS with custom brand colors
- **Data:** tRPC client calling `publicSite.listPlans` (no auth required)
- **Dev Port:** 3004
- **Prod Port:** 3000 (Nitro standalone, reverse-proxied by Caddy)

## Architecture

- No authentication — entirely public
- `lib/env.ts` uses **bare domain handling**: prepends `api.` to hostname (unlike other apps which replace the first subdomain segment)
- Screenshots in `public/screenshots/` are captured by `scripts/capture-screenshots.ts` from the running admin demo

## Key Files

| File | Purpose |
|------|---------|
| `lib/env.ts` | API URL derivation (bare domain → `api.` prefix) |
| `lib/trpc.ts` | tRPC client setup |
| `src/routes/index.tsx` | Landing page (assembles all sections) |
| `src/routes/impressum.tsx` | Legal: Impressum |
| `src/routes/datenschutz.tsx` | Legal: Datenschutz (GDPR privacy policy) |
| `src/components/features.tsx` | Feature carousel with screenshots (dashboard, season builder, game reports, etc.) |
| `src/components/featureShowcase.tsx` | Detailed feature spotlights (AI recaps, trikot designer, CMS, roles, scheduling, stats) |
| `src/components/pricing.tsx` | Dynamic pricing from DB |
| `src/components/demoCta.tsx` | Demo CTA + dialog with role-based demo login (magic link to admin portal) |

## Docker & Deployment

- **Dockerfile target**: `marketing-site-runner` (multi-stage build in root `Dockerfile`)
- **Docker image**: `ghcr.io/sascha-gruesshaber/puckhub-marketing-site`
- **Production**: runs as a container in `docker-compose.prod.yml`, Caddy routes bare domain (`{$BASE_DOMAIN}`) to `marketing-site:3000`
- **Local testing**: `docker-compose.local.yml` with `puckhub-marketing-site:local` image, `docker/Caddyfile.local` routes `http://puckhub.localhost` to `marketing-site:3000`
- **CI/CD**: built in `.github/workflows/docker-build.yml` matrix, deployed to Coolify via `MARKETING_SITE_UUID`
- **Health check**: `GET http://localhost:3000/` (HTTP 2xx/3xx/4xx = healthy)
- **Scripts**: included in `scripts/docker-build.mjs`, `scripts/docker-push.mjs`, and `scripts/docker-test.mjs`

## i18n

- `src/i18n/translations.ts` — translation strings for DE/EN
- `src/i18n/index.tsx` — i18n provider and `useTranslation()` hook
- German is primary, English available via language toggle

## E2E Testing

- **Framework**: Playwright (Chromium only)
- **Test dir**: `e2e/` (2 spec files)
- **Specs**: `landing`, `legal-pages`
- **Isolation**: Root `e2e/global-setup.ts` / `e2e/global-teardown.ts` (shared across all apps)
- **Run**: `pnpm test:e2e:marketing`

## Conventions

- Brand colors defined in `tailwind.config.ts` under `brand.*`
- Font: Outfit (same as admin app)
- No `.js` extensions in imports
