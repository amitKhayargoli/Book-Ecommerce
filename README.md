# Bookstore

A full stack book ecommerce store. Next.js on the frontend, Express on the backend, MongoDB for storage, and a heavy focus on security.

## Features

- Book catalog with Google Books import and format specific pricing
- Cart, wishlist, orders, and Khalti payment checkout
- Address management with a map based picker
- Product reviews with ratings, sorting, and filtering
- Email verification, password reset, and Google OAuth sign in
- TOTP two factor authentication with backup codes
- Admin dashboard for books, orders, users, sessions, IP access, and audit logs

## Tech Stack

**Frontend**

- Next.js (App Router), React 19, TypeScript
- Tailwind CSS 4
- Three.js with React Three Fiber for 3D book visuals
- Leaflet with Baato maps for address search

**Backend**

- Node.js, Express 5, TypeScript
- Prisma ORM with MongoDB
- Zod for request validation
- JWT sessions, bcrypt, Google OAuth, TOTP MFA
- Rate limiting, CAPTCHA, account lockout, audit logging, and IP access control

**Infrastructure**

- Docker Compose for local development
- GitHub Actions for CI
- Vercel for deployment

## Getting Started

### Prerequisites

- Node.js 20 or newer
- MongoDB (local or Atlas)
- Google OAuth and Khalti credentials only if you enable those features

### Setup

1. Install dependencies.

```bash
npm install --prefix backend
npm install --prefix frontend
```

2. Configure environment variables.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

3. Generate the Prisma client.

```bash
cd backend
npx prisma generate
```

4. Run the development servers.

```bash
npm run dev --prefix backend   # API on http://localhost:4000
npm run dev --prefix frontend  # app on http://localhost:3000
```

Or run everything with Docker:

```bash
docker compose up
```

## Project Structure

```
backend/   Express API, Prisma schema, services, and routes
frontend/  Next.js application
docker-compose.yml
```

## Security

The project applies a layered set of security controls: hashed passwords, secure session cookies, per user rate limits, account lockout, email verification, TOTP MFA, session binding, upload validation with SVG sanitization, IP access rules, and a persisted audit log. See the security reports in the repository root for details.
