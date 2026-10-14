# DMT Print · Next.js

Rebuild of the DMT Print Laravel storefront and admin workflow with Next.js App Router, Prisma/PostgreSQL, and Cloudflare R2.

## Local setup

1. Copy `.env.example` to `.env` and fill in the PostgreSQL/Supabase connection, a random `SESSION_SECRET` (32+ characters), and Cloudflare R2 credentials.
2. Install dependencies with `npm install`.
3. Generate the client and apply the checked-in initial migration: `npm run db:generate`, then `npm run db:migrate`.
4. Set `DMT_ADMIN_EMAIL` and `DMT_ADMIN_PASSWORD` before `npm run db:seed` to create the first admin account and populate the catalog, options, and payment methods.
5. Start the app with `npm run dev`.

The initial SQL migration is generated from `prisma/schema.prisma`. Applying it or seeding requires a configured database. File uploads require R2; order design and payment proof objects are stored privately.

## Main routes

- Public storefront: `/`, `/katalog`, `/produk/[slug]`
- Customer flow: `/keranjang`, `/checkout`, `/cek-pesanan`, `/status-pesanan/[orderNumber]`
- Admin: `/admin`, then dashboard sections for orders, catalog, categories, stock, cashbook, and site settings
- Authenticated handlers: `/api/admin/*`; cart/checkout/order tracking: `/api/cart`, `/api/checkout`, `/api/track`
