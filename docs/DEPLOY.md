# Deploying JobFlow

JobFlow runs as two containers plus PostgreSQL. Redis is optional. Any host that builds a Dockerfile works: a VPS with Docker, or a container platform.

```
browser ──► web (Next.js, :3100) ──/api/*──► api (Express, :4100) ──► PostgreSQL
                                                     └──► Redis (optional)
```

The browser only talks to the web app. The web app forwards `/api/*` to the API, so the auth cookies stay first-party and no CORS setup is needed. The API does not have to be public if the host has a private network.

## 1. Database

Create a PostgreSQL 15+ database and copy its connection string. Some hosts require TLS. If yours does, add `?sslmode=require` to the URL.

## 2. API

Build from the repository root with `apps/api/Dockerfile`. On start, the container applies pending migrations (`prisma migrate deploy`) and then starts the server.

| Variable             | Value                                                                          |
| -------------------- | ------------------------------------------------------------------------------ |
| `NODE_ENV`           | `production` (already set in the image)                                        |
| `PORT`               | `4100`, or whatever the host assigns                                           |
| `DATABASE_URL`       | the connection string from step 1                                              |
| `JWT_ACCESS_SECRET`  | random, at least 32 characters                                                 |
| `JWT_REFRESH_SECRET` | random, at least 32 characters, different from the access secret               |
| `WEB_ORIGIN`         | the public web address, e.g. `https://jobflow.example.com` (no trailing slash) |
| `COOKIE_SECURE`      | `true`                                                                         |
| `REDIS_URL`          | optional; without it, rate limits and caches are per process                   |
| `SEED_DEMO`          | optional; `true` resets the demo account on every start                        |

Generate each secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`WEB_ORIGIN` is only used for CORS, when a browser calls the API directly instead of through the web app. Through the web app's proxy it has no effect, but set it anyway so direct calls work.

Health check: `GET /health` returns 200 when the database is reachable.

## 3. Web

Build from the repository root with `apps/web/Dockerfile` and pass one **build argument**:

| Build argument | Value                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `API_URL`      | the address where the web container reaches the API, e.g. `http://api:4100` on a private network or `https://api.jobflow.example.com` |

Next.js applies the `/api/*` rewrite at build time, so changing `API_URL` means rebuilding the image. Setting it only as a runtime variable has no effect.

The container listens on `PORT` (default `3100`). Point your domain at it with HTTPS. The secure cookies are not sent over plain HTTP.

## 4. Demo account

Pick one of these:

- Set `SEED_DEMO=true` on the API. The demo account is recreated on each start, so visitors always see clean data.
- Run it once from a shell in the API container: `npx prisma db seed`.
- Run it from your machine against the production database: `DATABASE_URL="<production url>" npm run db:seed`.

Login: **demo@whoischat.dev / demo1234**. The seed only touches that one account.

## 5. Check

1. `https://<api>/health` returns `{"status":"ok"}`, if the API is public.
2. Open the web address and sign in with the demo account.
3. In the browser dev tools, the `jf_access` and `jf_refresh` cookies are `Secure` and `HttpOnly`.
4. Sign out and sign in again, then register a new account.

## Troubleshooting

| Symptom                                                  | Cause                                                                 |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| Sign-in succeeds but you are sent back to the login page | `COOKIE_SECURE=true` over plain HTTP. Serve the site over HTTPS.      |
| `/api/*` returns 500 or times out                        | The web image was built with the wrong `API_URL`. Rebuild it.         |
| The API exits with "Invalid environment variables"       | A secret is shorter than 32 characters, or `DATABASE_URL` is missing. |
| The API exits during `prisma migrate deploy`             | The database is unreachable, or it requires `?sslmode=require`.       |
