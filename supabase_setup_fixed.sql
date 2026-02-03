-- ============================================
-- RIVAL B2B - Database Schema Setup
-- ============================================
-- Ejecuta este SQL en Supabase SQL Editor
-- ============================================

-- Step 1: Create tables
-- ============================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'center_owner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  zip_code TEXT,
  description TEXT,
  website TEXT,
  instagram TEXT,
  logo_url TEXT,
  center_type TEXT,
  status TEXT DEFAULT 'active',
  plan TEXT DEFAULT 'starter',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  coach_id UUID,
  coach_name TEXT,
  day_of_week TEXT NOT NULL,
  time TIME NOT NULL,
  capacity INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  image_url TEXT,
  emoji TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  user_id UUID,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  membership_start_date DATE,
  membership_end_date DATE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attended BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL,
  image_url TEXT,
  emoji TEXT,
  category TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  member_id UUID,
  quantity INTEGER NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable Row Level Security
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS Policies
-- ============================================

-- Users Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Centers Policies
DROP POLICY IF EXISTS "Center owners can read own centers" ON public.centers;
CREATE POLICY "Center owners can read own centers" ON public.centers
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Center owners can update own centers" ON public.centers;
CREATE POLICY "Center owners can update own centers" ON public.centers
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Center owners can delete own centers" ON public.centers;
CREATE POLICY "Center owners can delete own centers" ON public.centers
  FOR DELETE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Center owners can create centers" ON public.centers;
CREATE POLICY "Center owners can create centers" ON public.centers
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Classes Policies
DROP POLICY IF EXISTS "Center owners can read own classes" ON public.classes;
CREATE POLICY "Center owners can read own classes" ON public.classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = classes.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Center owners can update own classes" ON public.classes;
CREATE POLICY "Center owners can update own classes" ON public.classes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = classes.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Center owners can delete own classes" ON public.classes;
CREATE POLICY "Center owners can delete own classes" ON public.classes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = classes.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Center owners can create classes" ON public.classes;
CREATE POLICY "Center owners can create classes" ON public.classes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = center_id 
      AND centers.owner_id = auth.uid()
    )
  );

-- Members Policies
DROP POLICY IF EXISTS "Center owners can read own members" ON public.members;
CREATE POLICY "Center owners can read own members" ON public.members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = members.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Center owners can update own members" ON public.members;
CREATE POLICY "Center owners can update own members" ON public.members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = members.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Center owners can create members" ON public.members;
CREATE POLICY "Center owners can create members" ON public.members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = center_id 
      AND centers.owner_id = auth.uid()
    )
  );

-- Products Policies
DROP POLICY IF EXISTS "Center owners can read own products" ON public.products;
CREATE POLICY "Center owners can read own products" ON public.products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = products.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Center owners can update own products" ON public.products;
CREATE POLICY "Center owners can update own products" ON public.products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = products.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Center owners can create products" ON public.products;
CREATE POLICY "Center owners can create products" ON public.products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = center_id 
      AND centers.owner_id = auth.uid()
    )
  );

-- Sales Policies
DROP POLICY IF EXISTS "Center owners can read own sales" ON public.sales;
CREATE POLICY "Center owners can read own sales" ON public.sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = sales.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

-- Step 4: Create Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_centers_owner_id ON public.centers(owner_id);
CREATE INDEX IF NOT EXISTS idx_classes_center_id ON public.classes(center_id);
CREATE INDEX IF NOT EXISTS idx_members_center_id ON public.members(center_id);
CREATE INDEX IF NOT EXISTS idx_products_center_id ON public.products(center_id);
CREATE INDEX IF NOT EXISTS idx_sales_center_id ON public.sales(center_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON public.class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_member_id ON public.class_enrollments(member_id);

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Next steps:
-- 1. Create Storage bucket named "center-logos"
-- 2. Go to Storage → Permissions → Enable Public Access
-- 3. Run: npm run dev
-- ============================================
