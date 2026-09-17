# MASTER CODEX PROMPT

You are responsible for implementing the complete application described in `SPECIFICATION.md`.

## 1. Source of truth

Before changing any code:

1. Read `SPECIFICATION.md` completely.
2. Treat it as the authoritative product and technical specification.
3. Do not simplify, remove, reinterpret, or silently change business rules.
4. If the repository already contains code, inspect it first and preserve any compatible work.
5. If the repository is empty, initialize the project according to the specification.

Do not start by writing a large amount of code blindly. First inspect the repository and produce a concise implementation plan mapped to the phases in the specification.

---

## 2. Goal

Build a production-ready MVP of the multi-event registration and QR check-in system.

The finished app must include:

- Organizer/Admin authentication.
- Event creation/edit/publish/cancel.
- Public event pages.
- Public registration.
- Dynamic custom form fields.
- PostgreSQL + Prisma.
- Secure per-registration QR.
- Email confirmation with QR.
- Browser camera QR scanner.
- Duplicate check-in protection.
- Manual check-in.
- Dashboard.
- Participant search/filter/detail.
- CSV/XLSX export.
- Rate limiting.
- Seed data.
- Tests.
- README and deployment instructions.
- Production build that passes.

Do not stop at scaffolding or mock-only UI.

---

## 3. Required implementation approach

Use:

- Next.js App Router.
- TypeScript strict mode.
- Tailwind CSS.
- shadcn/ui.
- Prisma.
- PostgreSQL.
- Auth.js credentials + JWT sessions.
- bcryptjs.
- Zod.
- Resend.
- qrcode.
- html5-qrcode.
- ExcelJS.
- Upstash rate limiting in production.
- Vitest.
- Playwright.

Use the exact business logic and data model from `SPECIFICATION.md`.

Prefer stable, compatible package versions. Pin versions in `package.json`; do not leave an incoherent dependency graph.

---

## 4. Architecture rules

Maintain clear separation:

- React/UI.
- API route handlers.
- Zod validation.
- Services/business logic.
- Prisma/database.
- Email.
- QR.
- Export.
- Auth.
- Error mapping.

Do not place critical business logic only in client components.

Do not let the browser connect directly to PostgreSQL.

Do not expose server secrets to client bundles.

Use server components by default. Use client components only for browser-dependent interactions such as forms with rich state, dialogs, scanner camera, and client-side UX.

---

## 5. Database rules

Create Prisma migrations.

Implement all constraints from the specification, especially:

- unique event slug.
- unique user email.
- unique `(eventId, studentId)`.
- unique `(eventId, email)`.
- unique QR token hash.
- one check-in per registration.
- unique `(registrationId, eventFieldId)`.
- unique `(eventId, fieldKey)`.

Store timestamps in UTC.

Use appropriate indexes.

Never store raw QR tokens in the database.

QR token:
- cryptographically random.
- approximately 256-bit entropy.
- store SHA-256 hash only.

Registration code:
- atomically increment event registration counter.
- generate `{CODE_PREFIX}-{zero-padded number}`.
- safe under concurrent registration requests.

Use transactions for registration creation and concurrency-sensitive check-in logic.

For PostgreSQL concurrency, use a robust Prisma transaction strategy, preferably serializable isolation plus retry for serialization conflicts when appropriate.

Do not rely on frontend checks for capacity or uniqueness.

---

## 6. Authentication and authorization

- No public organizer signup.
- Seed admin/organizer users.
- Protect `/admin/*`.
- Protect `/api/admin/*`.
- Validate session server-side.
- Use secure cookies in production.
- Hash passwords using bcryptjs.
- Keep authorization server-side even when UI hides actions.

For MVP, authenticated organizers may manage all events.

---

## 7. Public registration rules

Implement exactly:

1. Normalize email and student ID.
2. Validate event exists.
3. Validate event is published and not cancelled.
4. Validate registration window.
5. Validate capacity.
6. Validate student ID uniqueness per event.
7. Validate email uniqueness per event.
8. Validate phone/faculty based on event configuration.
9. Validate active custom fields.
10. Generate QR token.
11. In a transaction:
    - protect capacity;
    - increment event counter;
    - create registration;
    - create custom answers.
12. Commit.
13. Generate QR image.
14. Send confirmation email.
15. Email failure must not rollback registration.
16. Return one-time QR payload for the success page.

Do not put raw QR token in the URL.

Use `sessionStorage` or equivalent client-only state for success-page QR persistence for the current browser session if needed.

---

## 8. Scanner/check-in rules

Scanner must be mobile-first.

When a QR is read:

- pause repeated scans while request is pending.
- send token to server.
- server hashes and looks up token.
- verify event match.
- verify registration status.
- verify check-in window.
- verify event is not cancelled.
- enforce one check-in per registration.
- create check-in with current organizer and method `QR`.

Responses/UI states:
- SUCCESS.
- ALREADY_CHECKED_IN.
- INVALID_QR.
- WRONG_EVENT.
- CHECKIN_NOT_OPEN.
- REGISTRATION_CANCELLED.

Duplicate scans must never create a second check-in.

Two organizers scanning the same QR concurrently must still produce exactly one check-in record.

Manual check-in must use method `MANUAL`.

---

## 9. Export rules

Implement both CSV and XLSX.

Export:
- core participant fields.
- custom fields.
- registration status/time.
- check-in status/time/method.

Before writing spreadsheet cells, neutralize formula injection for values starting with:
`=`, `+`, `-`, `@`.

Do not skip this security requirement.

---

## 10. Error handling

Use the standard error response from the specification.

Create a reusable application error model or equivalent.

Do not leak:
- stack traces.
- SQL details.
- secrets.
- raw QR tokens.

Map known Prisma/database conflicts into stable API error codes where appropriate.

---

## 11. Testing

Implement tests as part of the work, not as an afterthought.

At minimum implement the unit, integration/API, and Playwright critical flows listed in `SPECIFICATION.md`.

Camera hardware scanning may be mocked in CI, but:
- scanner UI states;
- QR token handling;
- check-in API;
- duplicate/wrong-event logic

must be testable.

Run quality gates after each phase:
- lint.
- TypeScript/typecheck.
- relevant tests.
- build when appropriate.

Fix failures before moving on.

---

## 12. Seed data

Create `prisma/seed.ts`.

Use fake data only.

Seed:
- 1 ADMIN.
- 1 ORGANIZER.
- 3 events.
- 20–30 registrations.
- several check-ins.
- custom fields.

Document dev credentials in README only if they are generated from safe development defaults, and clearly warn not to use them in production.

Prefer seed credentials from environment variables.

---

## 13. Environment validation

Create `.env.example`.

Validate required environment variables at startup on the server, but allow local development fallbacks only where the specification permits.

Never commit `.env`.

Expected environment variables include:

- DATABASE_URL
- DIRECT_URL
- AUTH_SECRET
- APP_URL
- RESEND_API_KEY
- EMAIL_FROM
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- SEED_ADMIN_EMAIL
- SEED_ADMIN_PASSWORD
- SEED_ORGANIZER_EMAIL
- SEED_ORGANIZER_PASSWORD

If external credentials are unavailable while developing, implement the integration cleanly and provide an explicit local-safe behavior rather than deleting the feature.

---

## 14. Deployment compatibility

The final project must be compatible with:

- Vercel.
- Supabase PostgreSQL.
- Resend.
- Upstash.

Ensure Prisma works correctly with Supabase connection pooling/direct migration setup.

Document:
- local database setup.
- migrations.
- seed.
- Vercel env vars.
- `prisma migrate deploy`.
- Resend sender verification.
- scanner HTTPS/camera requirement.

Do not auto-seed production.

---

## 15. UI requirements

Use a clean, minimal, professional admin style.

Use shadcn/ui consistently.

Required breakpoints to verify:
- 375px.
- 768px.
- 1440px.

Prioritize:
- mobile registration.
- mobile scanner.
- desktop dashboard/tables.

All forms need:
- labels.
- validation messages.
- loading states.
- disabled submit while pending.
- empty states.
- error states.

Do not spend excessive time on decorative animation before functional completion.

---

## 16. Work phase-by-phase

Follow this order:

### Phase 1 — Foundation
Initialize app, packages, config, Prisma, Auth, base layouts, env validation, error framework.

### Phase 2 — Event Management
Schema/migrations, event service/API, admin event list/create/edit/publish/cancel.

### Phase 3 — Public Registration
Public event page, form, custom fields, registration transaction, QR token/hash, success page.

### Phase 4 — Email
Resend integration and QR email.

### Phase 5 — Check-in
QR API, manual API, scanner UI, concurrency handling.

### Phase 6 — Dashboard & Participants
Metrics, trends, list, search/filter/pagination, detail drawer.

### Phase 7 — Export
CSV + XLSX + spreadsheet injection protection.

### Phase 8 — Testing & Hardening
Tests, rate limiting, security checks, responsive verification, build cleanup.

### Phase 9 — Documentation & Deployment
README, `.env.example`, seed instructions, deployment notes, final verification.

After every phase:
1. Summarize what changed.
2. Run relevant checks.
3. Fix errors.
4. Only then continue.

Do not ask the user for confirmation after every trivial step. Continue autonomously unless you are blocked by an external credential, an irreversible destructive action, or a real ambiguity not resolved by `SPECIFICATION.md`.

---

## 17. Required final verification

Before declaring completion, verify every item in the `Definition of Done` section of `SPECIFICATION.md`.

Run and report the final status of:

- install/dependency resolution.
- Prisma validation.
- migrations status.
- seed.
- lint.
- typecheck.
- unit/integration tests.
- Playwright critical tests.
- production build.

If anything cannot be executed because an external service credential is missing, clearly distinguish:
- implemented;
- locally verified;
- requires external credential to verify live.

Do not claim a feature is verified if it was not actually verified.

---

## 18. Final deliverables

The repository must contain at least:

- complete application source.
- Prisma schema.
- migrations.
- seed.
- tests.
- `.env.example`.
- README.
- `SPECIFICATION.md`.

At the end, produce a concise implementation report containing:

1. What was implemented.
2. Main architecture decisions.
3. Commands to run locally.
4. Dev login credentials or how to set them.
5. Required external-service setup.
6. Test/build results.
7. Any remaining limitation that is outside the specification or blocked by credentials.

Start now by reading `SPECIFICATION.md`, inspecting the repository, and creating the implementation plan.
