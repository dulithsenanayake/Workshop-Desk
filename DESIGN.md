# Design notes (one page)

## Stack and why
- **Node.js + Express + MongoDB (Mongoose):** small, well-known, and MongoDB's atomic single-document updates are exactly what the capacity rule needs. Works on a standalone server (no replica set), so it is easy to run locally and on a free Atlas tier.
- **Zod** validates every body, query and param at the edge. **JWT + bcrypt** for auth. **Helmet, CORS allow-list, login rate limit** for basic hardening.
- **React (Vite) + React Router** with no UI framework: the app is a handful of forms and tables, so plain CSS keeps it light and readable.

## How over-registration is prevented
A workshop keeps a counter, `activeCount`. A seat is claimed with **one atomic conditional update**:
`update where {_id, status: scheduled, activeCount < capacity} set activeCount += 1`.
MongoDB applies this per document atomically, so when ten people ask for the last seat at once, exactly one update matches and the rest get "workshop is full" (HTTP 409). There is no read-then-check window, no in-process lock (so it holds with many server instances), and no transaction needed.
Only after claiming a seat is the registration row inserted. If that fails (e.g. same email already registered, enforced by a *partial unique index* on active registrations) the seat is handed back. Cancelling atomically flips `active -> cancelled` first, so a double-click or two people cancelling together free only one seat. Editing capacity uses the same trick: it is rejected in the query itself if `activeCount > newCapacity`.
Verified by a test that fires 40 parallel requests at 5 seats.

## Access control
One permission matrix (`config/permissions.js`) mirrors the brief; routes declare `authorize('workshops:write')` etc. The user is re-loaded from the DB on every request, so a disabled account or changed role takes effect immediately. The UI hides what a role cannot do, but the API is what refuses it (403). Admins cannot change or disable their own account, so the system can never be left with nobody able to manage users.

## Other design decisions
- **Registration history:** rows are never deleted; they carry `registeredBy/At`, `cancelledBy/At` and an optional reason. A person can re-register after cancelling (the unique index only covers active rows).
- **Extra workshop fields:** location (three sites), description, duration. `status` is scheduled / completed / cancelled; only scheduled workshops accept registrations.
- **Finding workshops:** filters by date range, status, "has seats" / "at least N seats" (computed in the database so pagination stays correct), plus text search. The UI defaults to *scheduled with seats left* and has a "this week" shortcut.
- **Audit trail (bonus):** workshop edits and account/role/status changes are logged with actor, time and a before/after diff; Admin-only view. Passwords are never logged.
- **Frontend:** one seat meter (a square per seat) is the main visual cue, because "how many seats are left?" is the question the front desk asks all day. Forms disable on submit and always re-fetch afterwards, so a staff member sees if someone else took the last seat.

## Trade-offs and assumptions
- `activeCount` is denormalised for speed and atomicity; the registration rows remain the source of truth. A crash between the two writes could in theory leave the counter off by one (on the safe side: a seat unused, or after a failed compensation, one too few). `npm run reconcile` repairs it. Multi-document transactions would remove this but require a replica set.
- The brief's matrix gives Admin no workshop access, so Admins cannot see workshops or registrations. I followed it literally. The activity log is Admin-only for the same reason.
- JWT lives in `localStorage` (simple; XSS-exposed). An httpOnly cookie plus CSRF protection would be the production choice.
- Attendee emails are unique per workshop among active registrations; attendees have no accounts and no emails are sent.

## Skipped
Waitlist (bonus), email notifications, CSV export, password-change by the user themselves, frontend automated tests, refresh tokens. The backend tests need a running MongoDB.
