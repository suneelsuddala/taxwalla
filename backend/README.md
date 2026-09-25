# Taxwalla API foundation

This is the shared backend foundation for the Taxwalla web and mobile clients.
It is intentionally separate from the browser prototype and from the disabled
legacy SMS service.

## Setup

1. Install Node.js 20 or newer and PostgreSQL.
2. Copy `.env.example` to `.env` and set a long random `SESSION_SECRET`.
3. Create a PostgreSQL database and apply `schema.sql`.
4. Install dependencies with `npm install`.
5. Start with `npm start`.

The API listens on port `8788` by default. The health endpoint is
`GET /health`.

## Render deployment

The repository includes `../render.yaml` for a Render web service. Create a
service from that blueprint, then set `DATABASE_URL`, `SESSION_SECRET`, and
`APP_ORIGIN` as private environment variables in Render. Do not commit those
values or paste them into chat. Use the Supabase connection-pooler URI when
the direct database host is not reachable from Render. The production server
enables PostgreSQL TLS automatically; set `PGSSL=disable` only for a local
non-TLS database. Set `APP_ORIGIN` to the exact public Netlify origin, then
verify `/health` before connecting a client.

## Current API

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET/POST /api/v1/products`
- `GET/POST /api/v1/customers`
- `GET /api/v1/invoices`
- `GET/POST /api/v1/payments`
- `GET/POST /api/v1/expenses`
- `GET/POST /api/v1/purchases`
- `GET/POST /api/v1/returns`
- `GET /api/v1/reports/summary`

All business data endpoints require an `Authorization: Bearer <token>` header
and scope every query through the authenticated business membership.

This is a foundation, not a production launch. Before public deployment, add
refresh-token rotation and revocation, rate limiting, schema validation,
structured request IDs, migrations, backups, observability, CSRF protection
where cookie sessions are used, and security/load testing.
