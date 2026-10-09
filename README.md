# Workshop Desk

Registration system for a community training centre: staff register attendees for workshops with limited seats,
and **a workshop can never hold more active registrations than its capacity**, even when several people register at the same moment.

**Stack:** Node.js · Express · MongoDB (Mongoose) · Zod · JWT · React (Vite) · React Router.
Design decisions, trade-offs and how over-registration is prevented are in [`DESIGN.md`](DESIGN.md).

## Quick start

Requirements: Node 18+ and MongoDB (local install, or `docker compose up -d` from the repo root).

```bash
# 1. API
cd backend
cp .env.example .env          # defaults work for local development
npm install
npm run seed                  # creates demo accounts + sample workshops
npm run dev                   # http://localhost:5000

# 2. Web app (second terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173  (proxies /api to :5000)
```

### Dev-only seeded logins

| Role | Email | Password | Can do |
|---|---|---|---|
| Admin | `admin@example.com` | `Admin123!` | Create accounts, set roles, disable users, activity log |
| Manager | `manager@example.com` | `Password123!` | Add/edit workshops, register/cancel, view everything |
| Front desk (staff) | `staff@example.com` | `Password123!` | Register/cancel attendees, view workshops and history |

There is no public sign-up; the first Admin is seeded and Admins create every other account.
Sample data includes `FIT-110`, which is almost full (a good place to try the capacity rule).

## Tests

The tests run against a real MongoDB (they use the separate `workshops_test` database and wipe it).

```bash
cd backend && npm test
```

They cover: the permission matrix, 40 simultaneous registrations for 5 seats (exactly 5 succeed), the same attendee registered concurrently,
cancel + seat reuse + history, capacity edits, and the seat/date/status filters.

## API overview

All routes are under `/api`. Errors look like `{ "error": { "message": "...", "details": [...] } }`.

| Method & path | Who | Notes |
|---|---|---|
| `POST /auth/login` · `GET /auth/me` | anyone / signed in | JWT bearer token |
| `GET/POST /users` · `PATCH /users/:id` | Admin | create accounts, change role, disable, reset password |
| `GET /workshops` | Manager, Staff | filters: `from`, `to`, `status`, `hasSeats=true`, `minSeats=N`, `q`, `page`, `limit` |
| `GET /workshops/:id` | Manager, Staff | includes `seatsAvailable` |
| `POST /workshops` · `PATCH /workshops/:id` | Manager | |
| `GET /workshops/:id/registrations` | Manager, Staff | full history incl. cancelled; `?status=active\|cancelled` |
| `POST /workshops/:id/registrations` | Manager, Staff | body `{ attendeeName, attendeeEmail }`; `409` when full/duplicate |
| `POST /workshops/:id/registrations/:rid/cancel` | Manager, Staff | frees the seat, keeps the record |
| `GET /audit` | Admin | bonus: who changed what and when (workshops, accounts, roles) |

Example, workshops this week that still have seats:
`GET /api/workshops?from=2026-10-05T00:00:00Z&to=2026-10-11T23:59:59Z&status=scheduled&hasSeats=true`

## Project layout

```
backend/
  src/config/        env, db connection, permission matrix (single source of truth)
  src/models/        User, Workshop, Registration, AuditLog
  src/middleware/    authenticate, authorize(permission), validate(zod), error handler
  src/validators/    zod schemas per resource
  src/services/      business logic (registrationService holds the capacity rule)
  src/routes/        thin HTTP layer
  scripts/           seed.js, reconcile.js
  tests/             node:test + supertest
frontend/src/
  api/ context/ hooks/ components/ pages/ utils/
```

## Maintenance

`npm run reconcile` (in `backend`) recomputes every workshop's seat counter from the registration records. It should always report 0 corrections; it exists as a safety net.

## Deploying (optional)

Frontend: any static host (`npm run build`, set `VITE_API_URL`). API: any Node host with MongoDB Atlas (free tier);
set `NODE_ENV=production`, `MONGO_URI`, a long random `JWT_SECRET`, and `CORS_ORIGIN` to the frontend URL. Do not run `seed` in production with the demo passwords.
