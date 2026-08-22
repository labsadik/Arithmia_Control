# OmniAgent Control Dashboard

## Goal
Build a dark-themed enterprise SaaS dashboard with a collapsible sidebar, top header, KPI cards, and a split main layout containing an activity stream and a quick-action panel.

## What will change
- `src/styles.css` — introduce a dark-first enterprise color system (navy/cyan) and semantic tokens for status badges, cards, and surfaces.
- `src/routes/__root.tsx` — apply dark mode by default, add Google Fonts link, and wrap the app in a `SidebarProvider` with a global header.
- `src/components/app-sidebar.tsx` — collapsible sidebar with Dashboard, Active Agents, Human-in-the-Loop Approvals, Cost & Analytics, and Settings links.
- `src/components/dashboard-header.tsx` — top header with search, Production/Staging environment selector, and user profile avatar.
- `src/routes/index.tsx` — dashboard page with four KPI cards, a live agent activity stream with colored status badges, and a quick-action panel with a prominent “Deploy New AI Agent” button.
- New helper components for status badges and KPI cards.

## Verification
- Preview loads on `/` without the placeholder page.
- Dashboard shows the requested KPIs, sidebar links, header controls, and the split activity/quick-action layout.
- Build passes with no type errors.
