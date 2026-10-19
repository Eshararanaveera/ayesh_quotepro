# QuotePro — Backend API

Node.js + Express 5 + Prisma + **MySQL 8** (MariaDB 10.6+ also works). It stores everything the frontend does: admin login, clients, quotations (with item photos), invoices and settings.

## 1. Requirements

- **Node.js 20 or newer**: `node -v`
- **MySQL**, one of:
  - **XAMPP** (easiest on Windows): install from apachefriends.org, open the XAMPP Control Panel and click **Start** next to **MySQL**. The user is `root` with no password.
  - **MySQL 8 Community Server** from dev.mysql.com (remember the root password you choose during setup). MySQL Workbench comes with it.
  - **Cloud:** Railway, Aiven or your cPanel hosting. Copy the MySQL connection string they give you.

Create an empty database called `quotepro`. In phpMyAdmin (http://localhost/phpmyadmin with XAMPP) click **New**, type `quotepro`, choose **utf8mb4_unicode_ci** and click **Create**. You can also run this in MySQL Workbench or the `mysql` command line:

```sql
CREATE DATABASE quotepro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 2. Set up

```bash
cd backend
npm install                    # also generates the Prisma client
cp .env.example .env           # Windows: copy .env.example .env
```

Edit `.env`:
- `DATABASE_URL`: your MySQL connection string, in the form `mysql://USER:PASSWORD@HOST:3306/quotepro`
  - XAMPP: `mysql://root@localhost:3306/quotepro`
  - MySQL installer: `mysql://root:YourPassword@localhost:3306/quotepro`
  - If the password contains `@ : / # ?` or `%`, URL-encode it (for example `@` becomes `%40`).
- `JWT_SECRET`: a long random string. Generate one with
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Create the tables and the first admin:

```bash
npx prisma migrate dev --name init   # creates prisma/migrations and all 7 tables
npm run db:seed                      # admin + settings + sample data
npm run dev                          # API on http://localhost:4000/api
```

Sign in with **admin@quotepro.lk / Admin@123**. The app asks you to change the password.

> **The `migrate dev` command needs permission to create a temporary "shadow" database.** That works with `root` locally. On shared or cloud hosting where you can't create databases, use `npx prisma db push` instead to create the tables. You can also run `database/schema.sql` in phpMyAdmin (**Import** tab).

### Tables

`users`, `clients`, `quotations`, `quotation_items`, `invoices`, `settings`, `document_sequences`. Open them in phpMyAdmin or Workbench, or run `npm run db:studio`.

## 3. Check every operation

With the API running, open a second terminal:

```bash
npm run smoke
```

This signs in, then creates, edits, approves, invoices and deletes test records, checks each answer (including the tax maths), and removes what it created. Every line should show ✅.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the API with auto-reload |
| `npm run build` / `npm start` | Production build / run |
| `npm run db:migrate` | Create a migration after you change `schema.prisma` |
| `npm run db:deploy` | Apply migrations on a server (production) |
| `npm run db:seed` | Add the admin user, settings and sample data |
| `npm run db:studio` | Browse and edit the database in your browser |
| `npm run db:reset` | ⚠️ Delete everything and start again |
| `npm run smoke` | Test every API operation |

## API

All routes are under `/api`. Everything except `/health` and `/auth/login` needs the header `Authorization: Bearer <token>`.

| Method | Route | Description |
| --- | --- | --- |
| GET | `/health` | API and database status |
| POST | `/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | Current user |
| POST | `/auth/change-password` | `{ currentPassword, newPassword }` |
| GET | `/clients?search=` | List or search clients |
| POST · GET · PUT · DELETE | `/clients` · `/clients/:id` | Create, read, update, delete |
| GET | `/quotations?status=&search=&clientId=` | List quotations (with items) |
| POST | `/quotations` | Create; the server assigns the number and calculates totals |
| GET · PUT · DELETE | `/quotations/:id` | Read, update, delete |
| PATCH | `/quotations/:id/status` | `{ status: "approved" }` etc. |
| POST | `/quotations/:id/invoices` | Invoice an approved quotation `{ dueInDays?, amount? }` |
| GET | `/invoices?status=paid\|unpaid\|overdue&search=` | List invoices |
| PATCH | `/invoices/:id/status` | `{ status: "paid" \| "unpaid" }` |
| DELETE | `/invoices/:id` | Delete an unpaid invoice |
| GET · PUT | `/settings` | Company, tax and quotation defaults (PUT is admin only) |
| GET | `/dashboard/summary` | Totals for the dashboard |

Errors always look like `{ "error": "Message", "details": { "field": "problem" } }`.

## Business rules

- **Totals are calculated on the server:** Subtotal → Discount → SSCL 2.5% on net → VAT 18% on (net + SSCL). Totals sent by a browser are ignored.
- **Numbers** like `QT-2026-0001` and `INV-2026-0001` come from a counter updated with `INSERT … ON DUPLICATE KEY UPDATE` inside a transaction, so two users can never get the same number. The counter starts again each year.
- **Client copy:** each quotation stores a copy of the client's details, so deleting or editing a client never changes issued quotations.
- **Expiry:** pending quotations past their "valid until" date become **expired**. Unpaid invoices past their due date show as **overdue**. "Today" uses `APP_TIMEZONE` (Asia/Colombo).
- **Invoicing:** only approved quotations can be invoiced, part payments are allowed up to the remaining balance, and invoiced quotations can't be edited or deleted.
- **Security:**
  - Passwords are hashed with bcrypt.
  - Login tokens are JWTs.
  - Sign-in is limited to 10 attempts per 15 minutes.
  - Only the frontends listed in `CORS_ORIGIN` can call the API.

## Deploying (example: Render + Railway MySQL)

1. On [railway.app](https://railway.app), create a **MySQL** database. Copy its public `MYSQL_PUBLIC_URL` (starts with `mysql://`).
2. On [render.com](https://render.com), create a **Web Service** from your GitHub repo with these settings:
   - Root directory: `backend`
   - Build command: `npm install && npm run build && npx prisma migrate deploy`
   - Start command: `npm start`
   - Environment: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `CORS_ORIGIN=https://your-app.vercel.app`
3. Run the seed once from your computer with the production `DATABASE_URL` set: `npm run db:seed`.
4. In Vercel, set `VITE_API_URL=https://your-api.onrender.com/api` for the frontend and redeploy.

Commit the `prisma/migrations` folder that `migrate dev` created, so `migrate deploy` can build the same tables on the server.

## Common MySQL errors

| Error | Fix |
| --- | --- |
| `P1001: Can't reach database server` | MySQL isn't running. Start it in XAMPP, or check the host and port in `DATABASE_URL`. |
| `P1000: Authentication failed` | Wrong user or password in `DATABASE_URL`. |
| `P1003: Database quotepro does not exist` | Create the database first (step 1). |
| `P3014: Prisma Migrate could not create the shadow database` | The user can't create databases. Use `npx prisma db push`. |
| `DATABASE_URL must be a MySQL URL` | The URL must start with `mysql://`. |
