# VSP Cold Pressed Oils & Dry Fruits — Nx monorepo

```
apps/api        Node.js + Express + Socket.IO + Prisma (PostgreSQL)
apps/web        Angular 18 storefront, owner dashboard and chat
libs/shared     Types and permission rules used by BOTH apps
```
One `package.json`, one `npm install`, one `.env`.

## Run locally
1. Install Node.js 22 and PostgreSQL. Create an empty database named `vsp`.
2. `npm install`
3. Copy `.env.example` to `.env` and fill in DATABASE_URL, the two secrets, WHATSAPP_ADMIN_NUMBER, SEED_ADMIN_PASSWORD.
4. `npm run db:migrate -- --name init`  (creates tables; keep the generated `migrations` folder)
5. `npm run db:seed`                     (owner account + sample products)
6. `npm run dev`                         (API on :4000, website on http://localhost:4200)

## Commands
| Command | What it does |
|---|---|
| `npm run dev` | API + website together |
| `npm run serve:api` / `serve:web` | Run one app |
| `npm run build` | Production builds into `dist/apps/api` and `dist/apps/web` |
| `npm run start:api` | Run the built API (`NODE_ENV=production`, env vars set in the shell) |
| `npm run typecheck` | Type-check shared lib, API and web |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Database tasks |
| `npx nx graph` | See project dependencies |

## Production notes
Serve `dist/apps/web/browser` with any static host/nginx, proxying `/api`, `/uploads` and `/socket.io` to the API (same origin, so the refresh cookie works). Use HTTPS, set `COOKIE_SECURE=true` and `CORS_ORIGINS=https://vspoils.com`. Use `npm run db:deploy` (not `db:migrate`) on the server.

## Security (OWASP Top 10)
Argon2id passwords, OTP verification, lockout, rotating httpOnly refresh cookie, short-lived access tokens, permission-based access control, zod validation on every input, Prisma parameterised queries, helmet + rate limits + CORS allow-list, upload allow-list with magic-byte checks, server-side pricing, atomic stock updates, redacted structured logs, one fixed outbound host (no SSRF).
Not included yet: CAPTCHA on guest checkout, owner 2FA, upload malware scanning.

## Before launch
Use the Owner dashboard to add products with their sizes, prices and current stock, adjust inventory, and review or update customer orders. Customers can search, filter and sort the catalog to suit their preferences. Orders appear in the dashboard and are also sent through the configured WhatsApp notification (or the fallback link). Edit `apps/web/src/app/business.ts`, configure SMTP and an SMS provider (`apps/api/src/lib/notifier.ts`), and set WhatsApp Cloud API credentials.
