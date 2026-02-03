# 🔧 RIVAL Development Guide

Quick reference for developers working on RIVAL B2B features.

---

## 📂 Folder Structure for B2B

```
app/
├── for-centers/                   # Landing page para centros
│   └── page.tsx                   # GET /for-centers
│
├── center-signup/                 # Signup flow
│   └── page.tsx                   # GET/POST /center-signup (4-step form)
│
├── center/                        # Center dashboard & management
│   └── [centerId]/
│       ├── page.tsx               # Dashboard home
│       ├── profile/               # Center profile (social)
│       ├── classes/               # Classes management
│       ├── members/               # Members list
│       ├── store/                 # Tienda
│       ├── analytics/             # Analytics dashboard
│       ├── leads/                 # Trial requests (lead mgmt)
│       └── settings/              # Center settings
│
├── api/
│   ├── centers/                   # Center CRUD
│   │   └── route.ts               # POST /api/centers (create), GET /api/centers (list)
│   │
│   ├── classes/                   # Classes API
│   │   ├── route.ts               # POST/GET /api/classes
│   │   └── [classId]/
│   │       └── route.ts           # PATCH/DELETE
│   │
│   ├── trial-requests/            # Lead management
│   │   └── route.ts               # POST/GET /api/trial-requests
│   │
│   └── memberships/               # Subscriptions
│       └── route.ts               # POST/GET memberships
│
└── (existing user app)
```

---

## 🗄️ Database Tables (Supabase)

### Core Tables for B2B

| Table | Purpose | Primary Fields |
|-------|---------|----------------|
| `organizations` | Gym/center data | id, name, center_type, country, city, plan, owner_id |
| `center_roles` | User→Org mapping | organization_id, user_id, role (head_coach/coach/member) |
| `classes` | Class schedules | organization_id, coach_id, scheduled_time, max_capacity |
| `class_enrollments` | Attendance | class_id, user_id, attended, check_in_time |
| `trial_requests` | Lead management | organization_id, user_id, status (pending/approved/attended/converted) |
| `memberships` | Subscriptions | organization_id, user_id, renewal_date, stripe_subscription_id |
| `center_posts` | Social feed | organization_id, content, post_type (wod/announcement) |
| `center_products` | Store items | organization_id, name, price, stock_quantity |
| `orders` | Transactions | organization_id, user_id, total_amount, stripe_payment_intent_id |
| `center_reviews` | Ratings | organization_id, user_id, rating (1-5) |
| `center_followers` | Social follow | organization_id, user_id |

---

## 🔑 Key TypeScript Interfaces

```typescript
// Organization/Center
interface Organization {
  id: UUID
  name: string
  center_type: 'crossfit' | 'gym' | 'running' | 'yoga' | 'padel' | 'dance' | 'other'
  email: string
  country: string
  city: string
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  owner_id?: UUID
  verified: boolean
  is_public: boolean
  logo_url?: string
  cover_photo_url?: string
  bio?: string
}

// Center Role/Permission
interface CenterRole {
  id: UUID
  organization_id: UUID
  user_id: UUID
  role: 'head_coach' | 'coach' | 'member' | 'lead'
  permissions: string[] // ['manage_classes', 'see_analytics', ...]
}

// Class
interface Class {
  id: UUID
  organization_id: UUID
  coach_id?: UUID
  name: string
  scheduled_time: Timestamp
  duration_minutes: number
  max_capacity: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

// Trial Request (Lead)
interface TrialRequest {
  id: UUID
  organization_id: UUID
  user_id: UUID
  status: 'pending' | 'approved' | 'attended' | 'converted'
  fitness_level: string
  injuries?: string
  requested_date: Timestamp
  scheduled_date?: Timestamp
  feedback_rating?: 1-5
  converted_to_member: boolean
}

// Membership
interface Membership {
  id: UUID
  organization_id: UUID
  user_id: UUID
  membership_type: string // 'unlimited', '10_pack', etc
  price_paid: number
  renewal_date: Timestamp
  is_active: boolean
  stripe_subscription_id: string
}
```

---

## 🔗 API Endpoints (Phase 1)

### Centers
```
POST   /api/centers                 # Create center
GET    /api/centers                 # List public centers (with filters)
GET    /api/centers/:id             # Get center details (with reviews, followers)
PATCH  /api/centers/:id             # Update center (head_coach only)
```

### Classes
```
POST   /api/classes                 # Create class (coach+)
GET    /api/classes?org_id=X        # List org classes
GET    /api/classes/:id             # Get class details + enrollments
PATCH  /api/classes/:id             # Update class
DELETE /api/classes/:id             # Cancel class
```

### Trial Requests
```
POST   /api/trial-requests          # Submit trial request (user)
GET    /api/trial-requests?org_id=X # List requests (head_coach)
PATCH  /api/trial-requests/:id      # Approve/reject (head_coach)
POST   /api/trial-requests/:id/attend  # Mark attended (coach)
```

### Check-in
```
POST   /api/classes/:id/checkin     # Check-in by user
POST   /api/classes/:id/checkin-qr  # Check-in via QR (coach marks)
```

---

## 💾 Useful SQL Snippets

### Get center with stats
```sql
SELECT 
  o.*,
  COUNT(DISTINCT cr.user_id) as member_count,
  COUNT(DISTINCT cf.user_id) as follower_count,
  AVG(r.rating) as avg_rating
FROM organizations o
LEFT JOIN center_roles cr ON o.id = cr.organization_id AND cr.role = 'member'
LEFT JOIN center_followers cf ON o.id = cf.organization_id
LEFT JOIN center_reviews r ON o.id = r.organization_id
WHERE o.id = $1
GROUP BY o.id;
```

### Get trial funnel for org
```sql
SELECT
  COUNT(*) as total_requests,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
  COUNT(CASE WHEN status = 'attended' THEN 1 END) as attended,
  COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted
FROM trial_requests
WHERE organization_id = $1
AND created_at > NOW() - INTERVAL '30 days';
```

### Get class occupancy
```sql
SELECT 
  c.id,
  c.name,
  c.max_capacity,
  COUNT(ce.id) as enrolled_count,
  ROUND(100.0 * COUNT(ce.id) / c.max_capacity) as occupancy_percent
FROM classes c
LEFT JOIN class_enrollments ce ON c.id = ce.class_id
WHERE c.organization_id = $1
GROUP BY c.id;
```

---

## 🔐 Row-Level Security (RLS) Examples

### Only head coaches can update center
```sql
CREATE POLICY "head_coaches_can_update_org" ON organizations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM center_roles 
    WHERE organization_id = organizations.id 
    AND user_id = auth.uid()
    AND role = 'head_coach'
  )
);
```

### Members can only see their own memberships
```sql
CREATE POLICY "users_see_own_memberships" ON memberships
FOR SELECT USING (user_id = auth.uid());
```

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Sign up as new center (all 4 steps work)
- [ ] Verify center appears in `/api/centers` list
- [ ] Update center profile
- [ ] Create a class
- [ ] Enroll user in class
- [ ] Check-in user (manual + QR)
- [ ] Submit trial request
- [ ] Approve trial request
- [ ] User gets notification
- [ ] User attends trial
- [ ] Convert trial → member

### Edge Cases
- [ ] User tries to create center with existing email (error handling)
- [ ] Center tries to create class in past time
- [ ] User enrolls in full class (over capacity)
- [ ] Admin views analytics with no data
- [ ] Mobile responsiveness (forms, dashboard)

---

## 📝 Common Dev Tasks

### Add new field to center
1. Update SQL schema in `supabase_schema.sql`
2. Update TypeScript interface
3. Update form in `app/center-signup/page.tsx`
4. Update API endpoint
5. Update dashboard display

### Add new permission
1. Define in `CenterRole` interface
2. Add to RLS policies
3. Check permissions in API before returning data
4. Show/hide UI based on role

### Create new API endpoint
```typescript
// app/api/[resource]/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate
    if (!body.required_field) {
      return NextResponse.json({ error: 'Missing field' }, { status: 400 })
    }
    
    // Insert/update
    const { data, error } = await supabase
      .from('table_name')
      .insert(body)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

## 🐛 Debugging Tips

### Check RLS issues
```
Error: "row level security" or "policy"
→ Check RLS policies in Supabase console
→ Verify user has correct role
→ Test with service role key (if allowed)
```

### Debug API responses
```typescript
// Add logging
console.log('Request body:', body)
console.log('Supabase response:', { data, error })
```

### Check database state
```bash
# In Supabase console → SQL Editor
SELECT * FROM organizations WHERE email = 'test@center.com';
SELECT * FROM center_roles WHERE organization_id = 'xxx';
```

---

## 📦 Dependencies to Install (Future)

```bash
npm install stripe @stripe/react-stripe-js
npm install axios react-query
npm install recharts  # Analytics charts
npm install zustand  # State management
npm install react-hook-form zod  # Forms + validation
```

---

## 🚀 Deployment Checklist

- [ ] All env variables set in production
- [ ] Supabase RLS policies verified
- [ ] Error tracking (Sentry) configured
- [ ] Rate limiting enabled
- [ ] Backups automated
- [ ] Domain SSL certificate
- [ ] Analytics configured (Posthog)
- [ ] Support email endpoint working

---

## 📚 Quick Reference

**Get current user**: `auth.uid()` (in RLS policies)  
**Get org ID from URL**: `params.centerId`  
**Redirect after action**: `window.location.href = '/path'`  
**Show error**: `setError('message')`  
**Show loading**: `setLoading(true)`  
**Format currency**: `new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })`

---

**Updated**: January 24, 2026  
**For questions**: Check B2B_EXPANSION_PLAN.md or B2B_MVP_SETUP.md
