# Taxwalla deployment preparation

This repository now includes a containerized deployment shape for the current
web prototype and API foundation. It is not a public deployment and does not
register `taxwalla.in`, configure DNS, or provision a cloud account.

## Required before launch

1. Register or confirm ownership of `taxwalla.in`.
2. Choose a host that supports Docker, persistent PostgreSQL storage, backups,
   TLS certificates and private environment variables.
3. Copy `.env.production.example` to `.env` on the server.
4. Replace every `replace-with-*` value with a generated secret. Never commit
   `.env`.
5. Set `APP_ORIGIN` to the exact HTTPS origin that will serve the frontend.
6. Point DNS to the server only after the host firewall and TLS plan are ready.

## Local deployment rehearsal

From `gst-app`:

```powershell
Copy-Item .env.production.example .env
# Edit .env with private values
docker compose --env-file .env -f docker-compose.production.yml config
docker compose --env-file .env -f docker-compose.production.yml up --build -d
Invoke-RestMethod http://127.0.0.1/health
```

The browser app is served at `http://127.0.0.1/gst-app/`. The API is proxied
under `/api/`, so a future frontend integration can use the same origin.

## Operational checklist

- Restrict PostgreSQL to the private Docker network; do not publish port 5432.
- Configure automated encrypted database backups and test restoration.
- Put TLS in front of Nginx using the host provider or a managed proxy.
- Add rate limiting, request IDs, refresh-token rotation, migrations,
  observability, security testing and database migration automation before
  accepting customer data.
- Use a staging hostname before changing `APP_ORIGIN` to the production domain.
- Run `docker compose ... config` and a health check after every release.

The current local browser authentication remains separate from the backend
authentication. Do not call this production-ready until the frontend is
explicitly migrated to the API and the security checklist is complete.

## Release status

The deployment files are a rehearsal package, not a completed public launch.
Domain registration, DNS, hosting, TLS, provider credentials, backups and
production verification require external access and explicit operator control.

## Static-hosting targets

The frontend includes [netlify.toml](./netlify.toml) and [vercel.json](./vercel.json)
for a static preview deployment. These targets publish only the browser
prototype; the PostgreSQL API is not included. Complete a platform login and
upload/import the `gst-app` folder, then set the production API URL only after
the backend is hosted securely.

## API hosting next step

[render.yaml](./render.yaml) defines a Render web service for the API. Import
the repository or create the service manually, configure the three `sync: false`
variables from the Render dashboard, and verify the generated API URL:

```text
https://YOUR-API.onrender.com/health
```

Only after that URL returns `{ "ok": true, "database": "up" }` should the
frontend be migrated from browser-local storage to server-backed sessions.
