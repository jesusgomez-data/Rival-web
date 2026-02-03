-- ============================================
-- RIVAL B2B - Clean Database Setup
-- ============================================
-- STEP 1: Drop existing tables (if any)
-- ============================================

DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.class_enrollments CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.members CASCADE;
DROP TABLE IF EXISTS public.centers CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================
-- STEP 2: Create fresh tables
-- ============================================

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'center_owner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.centers (
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

CREATE TABLE public.classes (
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

CREATE TABLE public.members (
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

CREATE TABLE public.class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attended BOOLEAN DEFAULT FALSE
);

CREATE TABLE public.products (
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

CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  member_id UUID,
  quantity INTEGER NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: Enable Row Level Security
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Create Indexes
-- ============================================

CREATE INDEX idx_centers_owner_id ON public.centers(owner_id);
CREATE INDEX idx_classes_center_id ON public.classes(center_id);
CREATE INDEX idx_members_center_id ON public.members(center_id);
CREATE INDEX idx_products_center_id ON public.products(center_id);
CREATE INDEX idx_sales_center_id ON public.sales(center_id);
CREATE INDEX idx_class_enrollments_class_id ON public.class_enrollments(class_id);
CREATE INDEX idx_class_enrollments_member_id ON public.class_enrollments(member_id);

-- ============================================
-- STEP 5: Create RLS Policies
-- ============================================

-- Users Policies
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Centers Policies
CREATE POLICY "Center owners can read own centers" ON public.centers
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Center owners can update own centers" ON public.centers
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Center owners can delete own centers" ON public.centers
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Center owners can create centers" ON public.centers
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Classes Policies
CREATE POLICY "Center owners can read own classes" ON public.classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = classes.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

CREATE POLICY "Center owners can update own classes" ON public.classes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = classes.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

CREATE POLICY "Center owners can delete own classes" ON public.classes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = classes.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

CREATE POLICY "Center owners can create classes" ON public.classes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = center_id 
      AND centers.owner_id = auth.uid()
    )
  );

-- Members Policies
CREATE POLICY "Center owners can read own members" ON public.members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = members.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

CREATE POLICY "Center owners can update own members" ON public.members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = members.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

CREATE POLICY "Center owners can create members" ON public.members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = center_id 
      AND centers.owner_id = auth.uid()
    )
  );

-- Products Policies
CREATE POLICY "Center owners can read own products" ON public.products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = products.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

CREATE POLICY "Center owners can update own products" ON public.products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = products.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

CREATE POLICY "Center owners can create products" ON public.products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = center_id 
      AND centers.owner_id = auth.uid()
    )
  );

-- Sales Policies
CREATE POLICY "Center owners can read own sales" ON public.sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.centers 
      WHERE centers.id = sales.center_id 
      AND centers.owner_id = auth.uid()
    )
  );

-- ============================================
-- SETUP COMPLETE! ✅
-- ============================================
-- All tables created successfully
-- All RLS policies configured
-- All indexes created
--
-- Next steps:
-- 1. Create Storage bucket: "center-logos"
-- 2. Make it public in permissions
-- 3. npm run dev
-- ============================================
