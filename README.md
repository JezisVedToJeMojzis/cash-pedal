# 🚲 CashPedal — Bike Commute Tracker

A mobile-first PWA for tracking your bike commutes and the compensation you earn
per kilometre (e.g. an employer's "don't use public transport" allowance).

- **Track rides** with live GPS — distance, time, speed and a route drawn on a map (Strava-style).
- **Set your rate** (currency per km) in Settings; earnings are calculated and added to your monthly totals.
- **History** with per-month compensation totals.
- **Friends + leaderboard** — add friends by name and see who biked the most / earned the most each month.
- **Installable PWA** — add to home screen, works full-screen on your phone.

## Stack

- **SvelteKit** (Svelte 5, TypeScript) + `adapter-node`
- **PostgreSQL** via **Drizzle ORM** (`postgres.js` driver)
- **Leaflet** + OpenStreetMap tiles for the map
- **@vite-pwa/sveltekit** for the installable/offline PWA
- Auth: name + password, scrypt hashing (Node built-in), session cookies

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres (Docker) — exposed on host port 5433
docker compose up -d

# 3. Configure env
cp .env.example .env   # DATABASE_URL is preset for the docker-compose DB

# 4. Apply the database schema
npm run db:migrate

# 5. (optional) regenerate PWA icons
npm run icons

# 6. Run the dev server
npm run dev
```

Open the printed URL. Geolocation requires `https://` or `localhost` — both the
dev server (localhost) and a deployed HTTPS host satisfy this.

> **Testing GPS on a phone:** open the deployed HTTPS URL (or use your browser's
> dev-tools "Sensors → Location" to simulate movement on desktop). Browsers block
> geolocation on plain-`http` LAN IPs.

## Useful commands

```bash
npm run dev          # dev server
npm run build        # production build (adapter-node → build/)
npm run preview      # preview the production build
npm run check        # type-check

npm run db:generate  # generate a new SQL migration from schema changes
npm run db:migrate   # apply migrations
npm run db:push      # push schema directly (quick dev sync)
npm run db:studio    # Drizzle Studio (browse the DB)

docker compose up -d # start Postgres
docker compose down  # stop Postgres
```

## Project layout

```
src/
  hooks.server.ts                 ← loads the session user onto event.locals
  lib/
    geo.ts                        ← haversine / track distance (shared)
    format.ts                     ← money / distance / time formatting + earnings calc
    server/
      auth.ts                     ← scrypt hashing + sessions + cookies
      friends.ts                  ← accepted-friend lookups
      db/{index,schema}.ts        ← Drizzle client + schema
  routes/
    login, register               ← auth pages
    api/rides/+server.ts          ← POST: save a finished ride (server computes distance/earnings)
    (app)/                        ← authenticated area (guarded + bottom nav)
      track/                      ← live GPS + Leaflet map + start/finish
      history/                    ← rides grouped by month with totals
      leaderboard/                ← monthly ranking among you + friends
      friends/                    ← add / accept / remove friends
      profile/                    ← stats, rate/currency/company settings, logout
```

## Deployment

Built with `adapter-node`, so `npm run build` produces a Node server in `build/`
(run with `node build`). Set `DATABASE_URL` in the host's environment. A managed
Postgres (e.g. Neon) + a Node host (e.g. Render) works on free tiers.
