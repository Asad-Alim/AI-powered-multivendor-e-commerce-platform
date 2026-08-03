# IntelliMart 🛍️
 
> **Multivendor e-commerce platform with AI-powered cross-sell recommendations**
> Built with Next.js 15, Stripe, Google Gemini, and PostgreSQL
 
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-2D3748?style=flat-square&logo=postgresql)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat-square&logo=stripe)
![Gemini](https://img.shields.io/badge/Gemini-2.5--flash-4285F4?style=flat-square&logo=googlegemini)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=flat-square&logo=tailwindcss)
 
---
 
## Table of Contents
 
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Roles & Permissions](#roles--permissions)
- [Authentication & Session Handling](#authentication--session-handling)
- [Orders: Lifecycle, Multi-Vendor Checkout & Payments](#orders-lifecycle-multi-vendor-checkout--payments)
- [Coupons](#coupons)
- [Subscriptions & Commission Tiers](#subscriptions--commission-tiers)
- [AI Recommendations](#ai-recommendations)
- [Search](#search)
- [Notifications & Email](#notifications--email)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Stripe Local Testing](#stripe-local-testing)
- [Deployment (Vercel)](#deployment-vercel)
- [Known Issues](#known-issues)
- [License](#license)
---
 
## Overview
 
IntelliMart is a full-stack multivendor marketplace where customers shop from independent vendors, vendors manage their own stores, and admins oversee the entire platform. A single customer checkout can span multiple vendors at once — the backend splits the cart into one order per store, charges everything through a single Stripe Checkout Session, and settles each store's ledger independently once payment is confirmed.
 
It features real payment processing via Stripe (including subscriptions), AI-powered cross-sell recommendations via the Gemini API, an 11-status order lifecycle with full history tracking, live search autocomplete, and separate dashboards for all three roles.
 
---
 
## Tech Stack
 
| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router (Turbopack dev server) |
| UI | React 19, Tailwind CSS v4 |
| State Management | React Context API + `useReducer` (no Redux/Zustand) |
| Database | PostgreSQL (Neon-compatible, needs both a pooled and direct connection string) + Prisma ORM |
| Authentication | Custom JWT (`jsonwebtoken`) + `bcryptjs`, httpOnly cookie |
| Payments | Stripe Checkout (one-time + subscription mode) + Webhooks |
| AI | Google Gemini API (`gemini-2.5-flash`), called directly via `fetch` — no SDK |
| Image Upload | Cloudinary, via a manually-signed REST upload — no SDK |
| Email | Resend, via REST API — no SDK |
| Charts | Recharts |
| Icons | lucide-react |
| Toasts | react-hot-toast |
| Dates | date-fns |
 
> **Note:** the AI recommendation engine calls **Google Gemini**, not Anthropic Claude, despite the "Claude" name showing up in some stale comments (`.env.example` even mislabels the section "Anthropic Claude AI" right above the `GEMINI_API_KEY` line — that comment is wrong). The env var to set is `GEMINI_API_KEY`.
 
---
 
## Features
 
### Customer
- Browse products with search, category filter, price range, and sort
- **Live search autocomplete** — real-time product + category suggestions as you type, backed by `/api/search/suggestions`
- **Recently Viewed** — localStorage-tracked browsing history (component-level, not persisted server-side), shown on product pages
- **"More like this"** — same-category suggestions, pure DB query ordered by `soldCount`, no LLM involved (`/api/products/related`)
- **"You might also need"** — Gemini-powered complementary/cross-sell suggestions on product pages. The model is given the current product plus a candidate pool of top-selling products from *other* categories, and picks up to 4 genuine companion-purchase items (not similar substitutes). Falls back automatically to a same-category DB query if `GEMINI_API_KEY` isn't set, the candidate pool is empty, or the Gemini call/JSON-parse fails for any reason — this endpoint never hard-fails.
- Cart with quantity management, persisted to `localStorage` only (there is a `cart` JSON column on `User` in the schema, but nothing currently reads/writes it — cart state lives entirely client-side)
- Wishlist synced to the server (`User.wishlist` string array), with:
  - `GET /api/wishlist` to fetch it
  - `POST /api/wishlist` to toggle a single product
  - `PUT /api/wishlist` to bulk-merge a locally-built wishlist in right after login
- Coupon codes at checkout, supporting:
  - Usage limits (`usageLimit` / `usageCount`) and expiry
  - New-users-only coupons (checked against the buyer's count of previously-paid orders)
  - Plan-restricted coupons (e.g. Plus/Pro subscribers only)
  - Category-specific coupons (discount applies only to matching line items, pro-rated per store in a multi-vendor cart)
- COD and Stripe payment options
- Full order tracking with an animated visual timeline across all 10 statuses (see [Orders](#orders-lifecycle-multi-vendor-checkout--payments))
- Self-service order cancellation (while `PENDING`/`CONFIRMED`) with automatic Stripe refund and store-ledger reversal if it was already paid
- Return request flow: buyer requests a return on individual items within a delivered order, vendor/admin approves or rejects each item independently, with partial refunds and partial restocking
- Star ratings and reviews — a customer can only rate a product once they have an order for it in `DELIVERED` status, and only once per (user, product, order) combination
- Notifications system with unread badge in navbar, generated automatically by order-status changes, store approval, and payment events
- Profile management with password change and a client-side strength meter
- Saved delivery addresses (add, edit, delete, set default)
- Newsletter subscription (separate `NewsletterSubscriber` table, simple email capture — no double opt-in flow)
### Vendor
- Store creation with an admin approval workflow (`PENDING` → `APPROVED`/`REJECTED`/`SUSPENDED`) — the applicant's role only flips from `CUSTOMER` to `VENDOR` once an admin approves the store, not at the moment they submit the application
- Add, edit, delete products with multi-image Cloudinary upload
- Toggle stock availability per product
- Configurable per-store shipping fee and free-shipping threshold, applied automatically at checkout
- Toggle their own store's visibility (hide/unhide) independently of admin approval — a hidden store stops accepting new orders and new return requests, but existing orders remain fully fulfillable
- Order management with status updates that:
  - Auto-generate a tracking number the first time an order is marked `SHIPPED`
  - Send a shipping/out-for-delivery email to the buyer
  - Credit the store's earnings ledger on `DELIVERED` for COD orders (Stripe orders are credited earlier, at payment confirmation via webhook — see below)
- Earnings and payout tracking with a per-store platform commission percentage (`Store.commission`), which is automatically set by the buyer's own subscription plan tier if they subscribe to Plus/Pro (see [Subscriptions](#subscriptions--commission-tiers))
- Sales analytics with a revenue/orders area chart
- Top products leaderboard
- Customer reviews dashboard
### Admin
- Platform-wide revenue and order analytics
- Store approval / rejection, with an automatic email + in-app notification to the vendor on approval
- User management with role assignment
- Coupon creation and management
- Manual store activation toggle (independent of approval status) — vendors can also do this themselves for their own store now (see Vendor section)
### Platform
- Light / Dark mode with `localStorage` persistence
- Fully responsive — desktop, tablet, and mobile, with a dedicated full-screen mobile navbar (avatar, all nav links, unread badges)
- Email notifications (welcome, order confirmed, shipped/out-for-delivery, password reset, store approved) sent via Resend's REST API, with dev-mode console logging instead of sending when `RESEND_API_KEY` isn't set
- Stripe subscription checkout for Plus and Pro plans, which also silently upgrades/downgrades the vendor's store commission rate
- Input sanitization with `maxLength` on every form field, plus server-side validators in `lib/validate.js`
- Role-based access control (`CUSTOMER`, `VENDOR`, `ADMIN`) enforced in `lib/middleware.js` (`requireAuth`, `requireRole`, `requireAdmin`, `requireVendorOrAdmin`)
- Instant auth revocation via a `tokenVersion` counter checked against the database on every authenticated request — this is how bans and forced logouts take effect without waiting for the JWT to expire, without needing a session table for normal auth
- Idempotent Stripe webhook processing — every processed event ID is recorded in `ProcessedWebhookEvent`, so a `P2002` unique-constraint violation on retry is treated as "already handled" rather than an error
---
 
## Project Structure
 
```
intellimart-v3/
├── app/
│   ├── (public)/               # Customer-facing pages
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── shop/
│   │   ├── shop/[username]/    # Public vendor storefront page
│   │   ├── product/[productId]/
│   │   ├── wishlist/
│   │   ├── notifications/
│   │   ├── profile/
│   │   ├── pricing/            # Plus/Pro subscription plans
│   │   └── create-store/
│   ├── admin/                  # Admin dashboard
│   │   ├── analytics/
│   │   ├── approve/            # Store approval queue
│   │   ├── coupons/
│   │   ├── stores/
│   │   └── users/
│   ├── store/                  # Vendor dashboard
│   │   ├── add-product/
│   │   ├── edit-product/[productId]/
│   │   ├── manage-product/
│   │   ├── analytics/
│   │   └── orders/
│   ├── payment/success/
│   ├── reset-password/
│   └── api/                    # 45 route.js handlers
│       ├── auth/                 login, register, logout, me, forgot-password, reset-password
│       ├── products/             list/create + [productId] + related
│       ├── orders/               list/create + [orderId] + cancel, status, return-request(+approve/reject)
│       ├── payment/stripe/       checkout, subscription, webhook
│       ├── ai/recommendations/   Gemini-powered cross-sell
│       ├── search/suggestions/
│       ├── admin/                analytics, dashboard, coupons, stores, users
│       ├── store/                dashboard, analytics, orders, me, public/[username]
│       ├── coupon/               public, validate
│       ├── notifications/        list + [id]
│       ├── wishlist/
│       ├── address/               list/create + [id]
│       ├── ratings/
│       ├── newsletter/
│       └── upload/image/         Cloudinary
├── components/
│   ├── admin/
│   ├── store/
│   ├── Navbar.jsx               # Live search + mobile full menu
│   ├── SearchBar.jsx            # Autocomplete suggestions
│   ├── AIRecommendations.jsx
│   ├── RecentlyViewed.jsx
│   ├── OrderTimeline.jsx
│   ├── OrderSummary.jsx / OrderItem.jsx
│   ├── OrdersAreaChart.jsx       # Recharts revenue/orders chart
│   ├── ProductCard.jsx / ProductDetails.jsx / ProductDescription.jsx
│   ├── Rating.jsx / RatingModal.jsx
│   ├── AddressModal.jsx
│   └── ...
├── context/
│   ├── AppContext.jsx           # Auth, cart, wishlist, products, addresses, ratings
│   ├── StoreContext.jsx         # Active vendor store selection (for users who own multiple stores)
│   └── ThemeContext.jsx         # Dark / Light mode
├── lib/
│   ├── auth.js                  # JWT sign/verify, password hashing, token extraction, revocation check
│   ├── middleware.js             # requireAuth / requireRole / requireAdmin / requireVendorOrAdmin
│   ├── apiResponse.js             # success / error / unauthorized / forbidden / notFound / serverError / validationError
│   ├── email.js                  # Resend wrapper + HTML templates
│   ├── store.js
│   └── validate.js                # email/password/product/order/address validators, sanitizers
└── prisma/
    └── schema.prisma             # 15 models
```
 
> **Known issue:** the vendor store-settings page (shipping fee / free-shipping threshold form) currently lives at `app/api/store/settings/page.jsx` instead of `app/store/settings/page.jsx`. See [Known Issues](#known-issues).
 
---
 
## Data Model
 
15 Prisma models:
 
| Model | Purpose |
|---|---|
| `User` | Account, role, plan, wishlist, ban/revocation state |
| `Session` | Password-reset tokens only (not used for normal login sessions) |
| `Store` | Vendor storefront: approval status, commission %, shipping config, earnings ledger |
| `Product` | Catalog item: price/MRP, stock, category, view/sold counters |
| `Order` | One row **per store** per checkout (a multi-vendor cart creates several `Order` rows sharing one `orderGroupId`) |
| `OrderStatusHistory` | Append-only audit trail of every status an order has passed through |
| `OrderItem` | Line items within an order (composite key on `orderId` + `productId`); also tracks each item's exact discount share at checkout, plus per-item return status, reason, refund amount, and restock state |
| `Transaction` | Payment record tied 1:1 to an order (method, status, Stripe IDs, refund info) |
| `Rating` | Product review, unique per (user, product, order) |
| `Address` | Saved delivery addresses |
| `Coupon` | Discount codes with usage limits, plan/category/new-user restrictions |
| `ProcessedWebhookEvent` | Idempotency ledger for Stripe webhook events |
| `Payout` | Vendor payout records |
| `Notification` | In-app notifications with read/unread state |
| `NewsletterSubscriber` | Newsletter signup emails |
 
Key enums: `Role` (CUSTOMER/VENDOR/ADMIN), `Plan` (FREE/PLUS/PRO), `OrderStatus` (11 values, below), `PaymentMethod` (COD/STRIPE), `PaymentStatus` (PENDING/COMPLETED/FAILED/REFUNDED), `ItemReturnStatus` (NONE/REQUESTED/APPROVED/REJECTED), `StoreStatus` (PENDING/APPROVED/REJECTED/SUSPENDED).
 
---
 
## Roles & Permissions
 
| Action | Customer | Vendor | Admin |
|---|:---:|:---:|:---:|
| Browse/search/purchase products | ✅ | ✅ | ✅ |
| Create a store (pending approval) | ✅ | — | — |
| Manage own store's products/orders | — | ✅ | ✅ (any store) |
| Update order status | — | ✅ (own store's orders) | ✅ (any) |
| Approve/reject/suspend stores | — | — | ✅ |
| Assign user roles | — | — | ✅ |
| Create/manage coupons | — | — | ✅ |
| View platform-wide analytics | — | — | ✅ |
 
Enforcement happens server-side in every route via `lib/middleware.js` — `requireAuth` checks the JWT and revocation state, `requireRole(...roles)` additionally checks `user.role`. Ownership checks (e.g. "is this vendor's own store") are done inline per-route by comparing `store.userId` to the authenticated user's ID; admins are allowed to bypass ownership checks.
 
---
 
## Authentication & Session Handling
 
- Passwords are hashed with `bcryptjs` at cost factor 12.
- On login/register, a JWT is signed (`JWT_SECRET`, default expiry `2h`, configurable via `JWT_EXPIRES_IN`) and set as an httpOnly cookie (`auth_token`). A `Bearer` header is also accepted as a fallback for non-browser clients.
- **There is no traditional session table backing normal logins.** Instead, every authenticated request re-checks the user's `tokenVersion` and `isBanned` flags against the database (`lib/auth.js` → `getUserFromRequest`). Bumping `tokenVersion` (e.g. on a forced logout, ban, store approval, or password reset) instantly invalidates every JWT already issued to that user, without needing to track or delete individual sessions.
- The `Session` model that *does* exist in the schema is used **only** for password-reset tokens (`forgot-password` creates one prefixed `reset_...`; `reset-password` looks it up and deletes it once used; `logout` also clears any lingering ones for that user).
- `JWT_SECRET` falls back to a hardcoded dev string outside production, but throws at import time if unset in production — the app will fail to start rather than silently sign tokens with a public fallback secret.
---
 
## Orders: Lifecycle, Multi-Vendor Checkout & Payments
 
### Order status enum (11 values)
 
```
PENDING → CONFIRMED → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
                                                   ↓
                                     RETURN_REQUESTED → RETURNED / PARTIALLY_RETURNED
PENDING / CONFIRMED → CANCELLED → REFUNDED
```

`PARTIALLY_RETURNED` is system-derived, not vendor-settable: it's reached automatically when some, but not all, items on an order have been approved for return. If a further item on that order is later returned, the order can cycle back through `RETURN_REQUESTED` before settling again.
 
Every transition is appended to `OrderStatusHistory`, so the full timeline is reconstructable, not just the current status.
 
### Multi-vendor checkout, step by step
 
A single cart can contain products from several different stores. `POST /api/payment/stripe/checkout`:
 
1. Validates the address and re-fetches all products server-side (never trusts client-submitted prices); also blocks a vendor from checking out with their own store's products.
2. Groups cart items **by store**, computing each store's subtotal.
3. If a coupon is applied, computes the discount either against the whole cart or, for category-restricted coupons, only against the matching line items — then pro-rates that discount across stores by each store's share of the *eligible* subtotal (the matching-category subtotal for category-restricted coupons, or the whole-cart subtotal otherwise), so a store with none of the discounted category doesn't absorb part of a discount it has no eligible items for. Each item's exact discount share is persisted on its `OrderItem` row at this point, so later partial refunds can be computed net-of-discount instead of approximated.
4. Computes per-store shipping cost using that store's `shippingFee` / `freeShippingThreshold`.
5. **Reserves stock atomically** inside a DB transaction using a conditional `updateMany` (`stockCount: { gte: quantity } → decrement`) — if another buyer already took the last unit, the whole checkout aborts with a friendly "sold out" error instead of overselling.
6. Creates **one `Order` row per store**, all sharing a single `orderGroupId`, each with its own `Transaction` record in `PENDING` status.
7. Builds **one Stripe Checkout Session** covering every store's line items (plus a separate "Shipping — {store name}" line item per store where applicable), so the customer only pays once. The session expires after 45 minutes (shorter than Stripe's 24h default) so reserved stock isn't locked away if the buyer abandons checkout.
### What the webhook does (`POST /api/payment/stripe/webhook`)
 
- **Idempotency:** every event's Stripe `event.id` is inserted into `ProcessedWebhookEvent` as the *first* statement of its transaction; a duplicate delivery hits a unique-constraint violation, the whole transaction rolls back, and the handler just replies "received" without redoing any side effects.
- **`checkout.session.completed` (subscription mode):** upgrades the user's `plan` and sets their store's commission rate (see [Subscriptions](#subscriptions--commission-tiers)).
- **`checkout.session.completed` (payment mode):** for each order in the group — skips it if it was already cancelled/refunded in the meantime (race guard), marks it `CONFIRMED` and paid, increments `soldCount` on each product (stock was already decremented at checkout time, not here), credits the store's `totalEarnings`/`pendingPayout` net of commission, and increments the coupon's `usageCount` **once per cart**, even if the cart spanned multiple stores.
- **`checkout.session.expired` / `payment_intent.payment_failed`:** restores the reserved stock, marks the order(s) `CANCELLED`/`FAILED` — but only if they weren't already confirmed by a race-adjacent `completed` event.
- **`customer.subscription.deleted`:** downgrades the user back to `FREE` and resets their store commission.
- **`customer.subscription.updated`:** re-syncs plan + commission (e.g. a mid-cycle Plus → Pro upgrade).
### Vendor-driven status updates (`PATCH /api/orders/[orderId]/status`)
 
- Only the store's owner or an admin may update it.
- Marking an order `SHIPPED` auto-generates a tracking number if one doesn't already exist.
- Marking a **COD** order `DELIVERED` is the point at which it's finally marked `isPaid` and the store's earnings ledger is credited — Stripe orders were already credited back at payment confirmation.
- Triggers an in-app notification, and a shipping email on `SHIPPED`/`OUT_FOR_DELIVERY`.
### Buyer cancellation (`POST /api/orders/[orderId]/cancel`)
 
- Only allowed while `PENDING` or `CONFIRMED`.
- If a Stripe payment is still `PENDING` (webhook hasn't landed yet), cancellation is blocked until it resolves — prevents cancelling out from under an in-flight payment.
- Restores stock.
- If the order was already paid via Stripe, fires an actual `stripe.refunds.create(...)` call (not a stub), reverses the store's earnings ledger, and sets the order to `REFUNDED` instead of `CANCELLED`.
### Return requests (`POST /api/orders/[orderId]/return-request` + `/approve` + `/reject`)

- Buyer can request a return per item (not just per order) on a `DELIVERED` (or already `PARTIALLY_RETURNED`) order, as long as the store is still active; this flips the order to `RETURN_REQUESTED`.
- Approval and rejection are decided **per item**, not per order — a vendor can approve some requested items on an order and reject others in the same batch.
- On approval, everything happens synchronously in one DB transaction, with **no webhook involved**: stock is restored (`stockCount` incremented, `inStock: true`), the item's exact net-of-discount refund is computed from the discount share it was given at checkout, the store's earnings ledger is reversed, and — if the order was paid via Stripe — `stripe.refunds.create(...)` is attempted inside that same transaction. If every other item on the order is already `APPROVED`, this batch is treated as the order's final return: the once-only shipping fee is folded into the refund and the order settles as `RETURNED`; otherwise it settles as `PARTIALLY_RETURNED`.
- The Stripe refund call is wrapped in its own try/catch that only logs on failure (see [Known Issues](#known-issues)) — it does not roll back the rest of the transaction.
---
 
## Coupons
 
`Coupon` supports several independent restriction types that can be combined:
 
- `usageLimit` / `usageCount` — global redemption cap
- `expiresAt` — hard expiry
- `newUsersOnly` — only for buyers with zero prior *paid* orders
- `allowedPlans` — e.g. `["PLUS","PRO"]`; empty means no plan restriction
- `category` — restricts the discount to matching line items only; `null` applies cart-wide
- `isPublic` — whether it's listed for browsing (vs. a private/emailed code)
Validated both at cart-preview time (`GET /api/coupon/validate`) and again server-side at checkout — usage count is only ever incremented once payment is actually confirmed via the webhook, never at checkout-session creation, so an abandoned checkout doesn't burn a redemption.
 
---
 
## Subscriptions & Commission Tiers
 
Plans (`Plan` enum): `FREE`, `PLUS`, `PRO`. Subscribing (via `POST /api/payment/stripe/subscription`, Stripe subscription-mode Checkout) does two things when the webhook confirms it:
 
1. Sets `User.plan` and stores the Stripe subscription ID.
2. Sets the *commission rate on that user's store(s)* according to a fixed table baked into the webhook handler:
   | Plan | Commission |
   |---|---|
   | FREE | 10% |
   | PLUS | 9% |
   | PRO | 8% |
Cancelling a subscription (`customer.subscription.deleted`) resets both back to FREE/10%.
 
---
 
## AI Recommendations
 
`POST /api/ai/recommendations` — "You might also need" panel on product pages:
 
- Requires authentication (an explicit anti-abuse guard so unauthenticated traffic can't burn API credits).
- Builds a candidate pool: up to 30 active products from categories *other* than the current one, ranked by `soldCount`.
- Sends the current product + candidate list to Gemini (`gemini-2.5-flash`) with a prompt asking specifically for **complementary** items (accessories / companion purchases), not similar substitutes, and asks for strict JSON back.
- Validates the returned IDs against the actual candidate pool before trusting them, and caps at 4 results.
- Falls back to a same-category DB query (by `soldCount`) if: no API key is configured, there are no cross-category candidates, or anything about the Gemini call/response fails. The endpoint always returns `success: true` with *something* — it's designed to never break the page.
Same-category "More like this" is a separate, much simpler endpoint (`/api/products/related`) that never calls an LLM.
 
---
 
## Search
 
`GET /api/search/suggestions?q=...` — powers the navbar's live autocomplete:
- Requires at least 2 characters.
- Runs two parallel Prisma queries: up to 6 matching products (name or category, case-insensitive) ordered by `viewCount`, and up to 4 distinct matching category names.
- Computes each product's average rating on the fly from its `Rating` relation.
---
 
## Notifications & Email
 
In-app `Notification` rows are created automatically for: order status changes, payment confirmation, order cancellation, store approval/rejection. The navbar shows an unread-count badge; notifications can be marked read individually.
 
Transactional email (via Resend's REST API, no SDK) covers: welcome email, order confirmation, shipping/out-for-delivery, password reset, and store approval. All emails render through one shared HTML card template (`lib/email.js`). If `RESEND_API_KEY` is unset, sends are skipped and logged to the console in development instead of failing.
 
---
 
## API Reference
 
All routes live under `app/api/` and return a consistent envelope: `{ success: true, data }` or `{ success: false, error, details? }` (see `lib/apiResponse.js`). Auth-protected routes return `401` via the same envelope if the cookie/token is missing or invalid, `403` if the role/ownership check fails.
 
| Area | Routes |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Products | `GET/POST /api/products` (supports `?ids=id1,id2,...` for exact-ID batch lookup, used by the AI recommendations panel), `GET/PUT/DELETE /api/products/[productId]`, `GET /api/products/related` |
| Orders | `GET/POST /api/orders`, `GET /api/orders/[orderId]`, `POST /api/orders/[orderId]/cancel`, `PATCH /api/orders/[orderId]/status`, `POST /api/orders/[orderId]/return-request`, `POST /api/orders/[orderId]/return-request/approve`, `POST /api/orders/[orderId]/return-request/reject` |
| Payments | `POST /api/payment/stripe/checkout`, `POST /api/payment/stripe/subscription`, `POST /api/payment/stripe/webhook` |
| AI | `POST /api/ai/recommendations` |
| Search | `GET /api/search/suggestions` |
| Admin | `GET /api/admin/dashboard`, `GET /api/admin/analytics`, `GET/PATCH /api/admin/stores`, `GET/PATCH /api/admin/stores/[storeId]`, `GET/POST /api/admin/users`, `PATCH /api/admin/users/[userId]`, `GET/POST /api/admin/coupons`, `GET/PATCH/DELETE /api/admin/coupons/[code]` |
| Vendor / Store | `POST/PATCH /api/store` (PATCH toggles the calling vendor's own store visibility), `GET /api/store/me`, `GET /api/store/dashboard`, `GET /api/store/analytics`, `GET /api/store/orders`, `GET /api/store/public/[username]` |
| Coupons (customer-facing) | `GET /api/coupon/public`, `GET /api/coupon/validate` |
| Notifications | `GET /api/notifications`, `PATCH /api/notifications/[id]` |
| Wishlist | `GET/POST/PUT /api/wishlist` |
| Address | `GET/POST /api/address`, `PUT/DELETE /api/address/[id]` |
| Ratings | `POST /api/ratings` |
| Newsletter | `POST /api/newsletter` |
| Upload | `POST /api/upload/image` |
 
(45 route files in total, including the ones above.)
 
---
 
## Getting Started
 
### Prerequisites
- Node.js 18+
- PostgreSQL database — [Neon](https://neon.tech) free tier recommended (needs both a pooled `DATABASE_URL` and a `DIRECT_URL` for migrations)
### Installation
 
```bash
# 1. Clone the repo
git clone https://github.com/yourusername/intellimart.git
cd intellimart
 
# 2. Install dependencies
npm install
 
# 3. Set up environment variables
cp .env.example .env.local
# Fill in at minimum: DATABASE_URL, DIRECT_URL, JWT_SECRET
 
# 4. Push database schema
npx prisma generate
npx prisma db push
 
# 5. Start dev server
npm run dev
```
 
Open [http://localhost:3000](http://localhost:3000)
 
### Make yourself Admin
 
After registering, run this against your database:
 
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
```
 
---
 
## Environment Variables
 
These are the variables actually read by the code (verified against every `process.env.*` reference in the app):
 
```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
 
# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_CURRENCY_SYMBOL="$"
 
# Auth — any 32+ character random string
JWT_SECRET="your-long-random-secret"
JWT_EXPIRES_IN="2h"          # optional, defaults to 2h
 
# Stripe (Test mode)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID="price_..."
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID="price_..."
 
# Google Gemini (AI cross-sell recommendations)
GEMINI_API_KEY="AIza..."
 
# Cloudinary
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
 
# Resend
RESEND_API_KEY="re_..."
EMAIL_FROM="IntelliMart <noreply@yourdomain.com>"
```
 
**Minimum to run locally:** `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`.
Gemini, Cloudinary, and Resend all degrade gracefully in development: recommendations fall back to a same-category DB query, image upload falls back to a `placehold.co` placeholder image, and emails just log to the console instead of sending. Stripe checkout, by contrast, will actively return a `503` if `STRIPE_SECRET_KEY` is missing — payments are not optional/mocked.
 
> The checked-in `.env.example` also lists `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_NAME`, `REFRESH_TOKEN_SECRET`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `PLATFORM_COMMISSION`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN`. **None of these are read anywhere in the codebase** — grepping the whole repo for `CLERK`, `UPSTASH`, and `REFRESH_TOKEN_SECRET`/`refreshToken` turns up zero references outside `.env.example` itself. Auth is plain JWT, not Clerk; per-store commission comes from the `Store.commission` column (and the plan-tier table in the Stripe webhook), not a global env var; there's no rate-limiting implementation yet. Safe to leave unset, or worth trimming from `.env.example` in a cleanup pass.
 
---
 
## Stripe Local Testing
 
```bash
# Listen for webhooks locally
stripe listen --forward-to localhost:3000/api/payment/stripe/webhook
 
# Test card
4242 4242 4242 4242  (any future date, any CVC)
```
 
Note the checkout session is built with a 45-minute expiry and reserves (decrements) stock immediately at session creation — if you abandon a test checkout, stock is restored automatically via the `checkout.session.expired` webhook event, not immediately.
 
---
 
## Deployment (Vercel)
 
```bash
npm i -g vercel
vercel
```
 
Add all env vars in Vercel dashboard → Project → Settings → Environment Variables.
Then add your Stripe webhook endpoint: `https://yourdomain.vercel.app/api/payment/stripe/webhook`, subscribed at minimum to `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`, `customer.subscription.deleted`, and `customer.subscription.updated`.
 
---
 
## Known Issues
 
- **Misplaced settings page:** the vendor store-settings page (shipping fee / free-shipping threshold form) lives at `app/api/store/settings/page.jsx` instead of `app/store/settings/page.jsx`. Next.js still serves it fine as a page route since App Router doesn't distinguish `api/` specially for `page.jsx` files, but the path is misleading and should be moved.
- **Stale `.env.example` entries:** Clerk, Upstash, and refresh-token variables are documented but never used — see the [Environment Variables](#environment-variables) note above.
- **`User.cart` column is dead:** the schema has a `cart Json` field on `User`, presumably intended for server-synced carts (mirroring how wishlist works), but nothing in the app currently reads or writes it — cart state is `localStorage`-only.
- **`CONTRIBUTING.md` still refers to the project as "GoCart"**, left over from the template this project was originally based on — worth a find-and-replace pass if you plan to accept outside contributions.
- **Return-approval refund failures are silent:** in `return-request/approve/route.js`, the `stripe.refunds.create(...)` call is wrapped in a try/catch that only does `console.error` on failure — it does not throw, so it can't roll back the surrounding transaction. If the Stripe refund errors out (bad payment intent, insufficient balance, etc.), the item is still marked `APPROVED`, stock is still restored, and the store's earnings are still decremented, even though the customer was never actually refunded. Worth making that failure abort the transaction (or at minimum flag the order for manual review) instead of swallowing it.
---
 
## License
 
MIT — see [LICENSE.md](LICENSE.md)
 
---
 
Built with ❤️ by **Asad**