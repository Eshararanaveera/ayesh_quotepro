# QuotePro — Frontend

A quotation management system for Sri Lankan businesses, built with React, TypeScript, Vite and Tailwind CSS. It has a glassmorphism look, dark mode, LKR formatting and VAT/SSCL calculations.

## Setup

```bash
cd frontend
npm install
npm run dev
```

`package.json` lists every dependency. If you're merging into your existing project, install only what's missing:

```bash
npm i react-router-dom@6 lucide-react@0.460
npm i -D tailwindcss@3 postcss autoprefixer
```

Data is saved in the browser (localStorage) until a backend is connected. To reload the sample data, go to **Settings → Quotation Defaults → Reset data**.

## Routes

| Path | Page |
| --- | --- |
| `/login` | Admin sign in (public) |
| `/` | Dashboard: summary cards, recent quotations, pipeline |
| `/quotations` | Quotations list: search, status filter, sorting, pagination, View / Edit / Download PDF |
| `/quotations/new` | Create quotation (`?client=<id>` pre-selects a client) |
| `/quotations/:id` | Printable quotation, status actions, email, delete |
| `/quotations/:id/edit` | Edit quotation |
| `/customers` | Client cards with an Add / Edit client dialog |
| `/invoices` | Invoice tracking |
| `/settings` | Company profile and logo, tax settings, quotation defaults, appearance |

## Admin login

Every page except `/login` needs a login. On first run, sign in with **admin@quotepro.lk / Admin@123**, then change the password in **Settings → Security**. Use **Account menu → Sign out** to log out.

> This login runs only in the browser, so it keeps casual users out but isn't real security. When you add a backend, replace `login`, `changePassword` and `logout` in `src/context/AuthContext.tsx` with API calls, and check passwords on the server.

## Tax calculation (`src/utils/calculations.ts`)

```
Subtotal    = Σ (qty × unit price)
Net amount  = Subtotal − Discount
SSCL        = Net amount × 2.5%
VAT         = (Net amount + SSCL) × 18%
Grand total = Net amount + SSCL + VAT
```

Each step is rounded to the cent, so the printed lines always add up. The rates live in `src/config/constants.ts`. The default on/off for each tax is set in **Settings → Tax Settings**, and each quotation can override it.

> SSCL is a levy on turnover, and the tax-invoice format that came in on 1 July 2026 has no separate SSCL field. Confirm with your accountant whether to show SSCL as its own line on customer documents.

## Folder structure

```
src/
├── components/
│   ├── navigation/NavItem.tsx      Sidebar link (active state, badge, collapsed mode)
│   └── ui/                         Button, InputField, SelectField, TextAreaField, Switch,
│                                   Card, StatCard, StatusBadge, Modal, ConfirmDialog,
│                                   PageHeader, EmptyState, ThemeToggle
├── config/                         constants (tax rates, defaults, storage keys), navigation
├── context/                        ThemeContext, SettingsContext, DataContext (+ *-context.ts)
├── features/                       mock data, ClientFormModal, quotation helpers
├── hooks/                          useTheme, useSettings, useAppData, useQuotationCalculations
├── layouts/DashboardLayout.tsx     Collapsible sidebar, mobile drawer, header
├── lib/                            cn, createId, safe localStorage
├── pages/dashboard/                The seven pages
├── routes/AppRoutes.tsx
├── styles/colors.ts                Status colours (single source of truth)
├── types/                          quotation, invoice, settings
└── utils/                          formatters (LKR, amount in words), date, calculations
```

## Adding a backend later

Every page reads and writes data through `useAppData()`. To connect an API, replace the function bodies in `src/context/DataContext.tsx` with API calls. The pages don't need to change.
