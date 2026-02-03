# 🏋️ RIVAL - Social Fitness Network with B2B Module

**Status**: Alpha v2 (MVP + B2B Phase 1 Development)  
**Last Updated**: January 24, 2026

---

## 🎯 Project Overview

**RIVAL** is a next-generation fitness social network that combines:
- **B2C**: Individual athletes compete, track workouts, join communities
- **B2B**: Fitness centers manage operations, attract members, monetize

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Create .env.local with Supabase credentials
cp .env.example .env.local

# Run development server
npm run dev
```

Visit **http://localhost:3000** (User app) or **http://localhost:3000/for-centers** (B2B)

---

## 📁 Key Features

### ✅ For Individual Athletes (B2C)
- Social feed with posts, likes, comments
- Workout tracking with PR detection
- Leaderboards and rankings
- Follow system and duels
- Notifications bell
- Community features

### ✅ For Fitness Centers (B2B) - NEW!
- **Landing page** (`/for-centers`) with pricing and features
- **4-step signup** (email → type → location → plan)
- **Center dashboard** with overview stats
- **Database schema** with 12 tables for full center management
- **Role-based access** (Head Coach, Coach, Member, Lead)

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [**B2B_EXPANSION_PLAN.md**](./B2B_EXPANSION_PLAN.md) | Strategic doc (45K+ words) with market analysis, features, pricing, roadmap, KPIs |
| [**B2B_MVP_SETUP.md**](./B2B_MVP_SETUP.md) | Step-by-step implementation guide with setup instructions |
| [**supabase_schema.sql**](./supabase_schema.sql) | Complete database schema for B2B operations |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL), Next.js API Routes
- **Auth**: Supabase Auth with RLS
- **Hosting**: Vercel
- **Payments** (coming): Stripe Connect

---

## 📊 Monetization Model

**B2B Plans**:
- Free: €0/mo (100 members, basic features)
- Starter: €49.99/mo (500 members, trial system, store)
- Pro: €149.99/mo (2K members, IA, benchmarks)
- Enterprise: €499.99+/mo (unlimited, white label)

**Revenue**: 30% subscriptions + 70% store commissions

---

## 🚦 Project Status

| Phase | Status | Timeline |
|-------|--------|----------|
| Phase 1 (MVP) | 🟢 In Progress | Weeks 1-4 |
| Phase 2 (Leads & IA) | 🔴 Pending | Weeks 5-8 |
| Phase 3 (Scale) | 🔴 Planned | Weeks 9+ |

---

## 📋 Next Steps

1. **Setup Supabase**: Create project and run schema SQL (1-2h)
2. **Connect Frontend**: Integrate form with database (2h)
3. **Build Profiles**: Implement center social profiles (3h)
4. **Classes Module**: Create scheduling system (3-4h)

See [**B2B_MVP_SETUP.md**](./B2B_MVP_SETUP.md) for detailed instructions.

---

## 💡 Key Architecture

```
User (B2C) ←→ Organization (B2B)
   ↓                ↓
Profiles         Centers
   ↓                ↓
Workouts    Classes/Memberships
   ↓                ↓
Feed Posts     Center Posts
   ↓                ↓
Follows      Trial Requests
            (Leads Management)
```

---

**For more details, see the full documentation files above.**

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
