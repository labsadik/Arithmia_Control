# OmniAgent Control — Final Enterprise Build

## Goal
Add authentication & role-based access, fix any remaining rough edges, and build out the missing Cost & Analytics and Settings & Security screens so the app feels like a complete, professional SaaS prototype.

## Plan

### 1. Authentication & roles
- Add Supabase Auth login/signup at `/auth` with email/password and a one-click **Demo Login** button.
- Create `_authenticated` route layout and move all protected pages (Dashboard, Agents, Approvals, Analytics, Settings) under it.
- Add `user_roles` and `profiles` tables; seed an Admin demo user (`demo@omniagent.control`) and a Team Member demo user.
- Update RLS on `agents`, `approvals`, and `activity_events` so only authenticated users can read them (internal demo scope).
- Wire auth state changes in `__root.tsx` so sign-out redirects to `/auth` and caches invalidate cleanly.

### 2. Schema updates
- Add `agent_usage` table for time-series token/cost/latency data, with demo rows for the last 30 days split by provider (OpenAI, Anthropic, Gemini).
- Add `api_keys` table for generated system tokens with scopes (Read, Write, Execute) and revoke capability.
- Add `webhook_configs` table for webhook URL + secret.
- Add `security_guardrails` table for toggles: Max Daily Spending Limit, Block Unsafe Output, Require Approval for Database Writes.
- Keep `schema.sql` at the project root updated with every change.

### 3. Cost & Analytics page
- Interactive line/area chart of API Token Consumption over time, grouped by provider.
- Breakdown table: Agent Name, Model Used, Total Tokens, Average Latency (ms), Total Cost ($).
- Filter dropdowns: Date Range (Last 7 Days, Last 30 Days) and Model Provider.

### 4. Settings & Security page
- API Key management: list existing keys, generate new tokens with custom names, revoke keys, toggle Read/Write/Execute scopes.
- Webhook Configuration: URL input + secret key input.
- Security guardrails toggles: Max Daily Spending Limit, Block Unsafe Output, Require Approval for Database Writes.

### 5. Polish & final checks
- Fix any hydration, type, or lint issues surfaced during the build.
- Format with Prettier and run full build + lint.
- Drive the app with Playwright to verify login → dashboard → approvals → analytics → settings flows, and capture screenshots.

## Verification
- `/auth` shows login/signup/demo-login.
- Protected routes redirect unauthenticated users to `/auth`.
- Dashboard KPIs match demo data (14 active agents, ~$1,240 cost, 99.2% success, 3 pending approvals).
- Approvals screen still resolves requests and updates in real time.
- Analytics chart and table render with working filters.
- Settings page can generate/revoke API keys and toggle guardrails.
- Build passes with no errors.
