# Deploying JobOS to Render (+ Neon for Postgres)

Backend and frontend run on Render's free tier. The database runs on
[Neon](https://neon.tech) instead of Render's free Postgres, because Render
deletes free databases after 30 days — Neon's free tier has no such
expiration (it scales to zero when idle and auto-wakes on the next query).

## 1. Push this repo to GitHub
Render deploys from a GitHub repo, so commit and push these changes first.

## 2. Create a Neon project
Sign up at [neon.tech](https://neon.tech) (free, no card required) → **New
Project**. Neon has pgvector built in already — no extension setup needed.
Copy the connection string it gives you (starts with `postgres://` or
`postgresql://`; the app normalizes either automatically).

## 3. Create the Render Blueprint
In the Render dashboard: **New → Blueprint**, pick this repo. Render will read
`render.yaml` at the root and propose two resources:

- `jobos-backend` — Docker web service (FastAPI + LibreOffice for PDF export)
- `jobos-frontend` — static site (Vite build)

Click **Apply**. It'll prompt you for `DATABASE_URL` since it's marked
`sync: false` in `render.yaml` — paste in the Neon connection string here.

## 4. Run migrations + seed once
Render web services expose a **Shell** tab. Open one for `jobos-backend` and run:

```bash
psql "$DATABASE_URL" -f db/migrations/001_initial.sql
python -m db.seed
```

(`python db/seed.py` will NOT work here — it must run as `-m db.seed` so the
`db` package resolves correctly.)

## 5. Fix up the real service URLs
Render assigns each service a URL like `https://jobos-backend-xxxx.onrender.com`
— the exact suffix depends on name availability, so `render.yaml`'s guessed
`https://jobos-backend.onrender.com` / `https://jobos-frontend.onrender.com`
may not match. After the first deploy, go to each service's **Environment**
tab and update:

- `jobos-backend`'s `CORS_ORIGINS` → the real frontend URL
- `jobos-frontend`'s `VITE_API_BASE` → the real backend URL, then **trigger a
  redeploy of the frontend** (Vite bakes this in at build time, changing the
  env var alone doesn't update the already-built assets)

## 6. Add your secret keys
On `jobos-backend`, fill in the env vars marked `sync: false` in
`render.yaml` (`GROQ_API_KEY`, `GEMINI_API_KEY`, `AWS_*`) if those features are
in use — the app runs without them, they're just unset otherwise.

## 7. Verify
- `https://<backend-url>/health` → `{"status": "healthy"}`
- `https://<frontend-url>` → loads the dashboard, and My Profile shows real
  skills/projects (confirms the frontend is talking to the right backend and
  the DB was seeded)

## Free tier tradeoffs
- **Render backend (free web service):** spins down after 15 min idle. The
  first request after that takes ~30-50s to wake up; nothing breaks, it's
  just a cold start.
- **Neon database:** scales to zero when idle too, but wakes in ~1s on the
  next query — no manual step, no expiration, data is never deleted.
- **Render frontend (static site):** free forever, no spin-down — it's just
  static files.

## Local Docker (already verified working)

```bash
docker compose up -d --build
docker compose exec backend python -m db.seed   # first run only
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Postgres: localhost:5433 (mapped from the container's 5432, since a local
  Postgres install often already holds 5432 on the host)
