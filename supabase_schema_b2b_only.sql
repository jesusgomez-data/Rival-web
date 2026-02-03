-- ============================================
-- B2B SECTION: CENTERS & GYMS ONLY
-- Ejecuta esto en Supabase SQL Editor
-- ============================================

-- 1. ORGANIZATIONS/CENTERS
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    center_type TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    website TEXT,
    plan TEXT DEFAULT 'free',
    verified BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    logo_url TEXT,
    cover_photo_url TEXT,
    bio TEXT,
    member_count INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    monthly_revenue NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public organizations are viewable by everyone" ON public.organizations FOR SELECT USING (is_public = true);
CREATE POLICY IF NOT EXISTS "Users can view their own organization" ON public.organizations FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY IF NOT EXISTS "Owners manage their organization" ON public.organizations FOR ALL USING (auth.uid() = owner_id);

-- 2. CENTER ROLES & PERMISSIONS
CREATE TABLE IF NOT EXISTS public.center_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL,
    permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, user_id)
);

ALTER TABLE public.center_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view center roles" ON public.center_roles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Head coaches manage center roles" ON public.center_roles FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.center_roles 
        WHERE organization_id = center_roles.organization_id 
        AND user_id = auth.uid() 
        AND role = 'head_coach'
    ));

-- 3. CLASSES/SESSIONS
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    class_type TEXT,
    difficulty TEXT,
    max_capacity INTEGER DEFAULT 30,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_days TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Classes viewable by organization members" ON public.classes FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.center_roles 
        WHERE organization_id = classes.organization_id 
        AND user_id = auth.uid()
    )
);

-- 4. CLASS ENROLLMENTS
CREATE TABLE IF NOT EXISTS public.class_enrollments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    attended BOOLEAN DEFAULT FALSE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(class_id, user_id)
);

ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view enrollments" ON public.class_enrollments FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can manage own enrollments" ON public.class_enrollments FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 5. TRIAL CLASSES (LEAD MANAGEMENT)
CREATE TABLE IF NOT EXISTS public.trial_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    fitness_level TEXT,
    injuries TEXT,
    requested_date TIMESTAMP WITH TIME ZONE,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    converted_to_member BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.trial_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Trial requests viewable by organization" ON public.trial_requests FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.center_roles 
        WHERE organization_id = trial_requests.organization_id 
        AND user_id = auth.uid()
    ) OR user_id = auth.uid()
);

-- 6. MEMBERSHIPS
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    membership_type TEXT,
    price_paid NUMERIC,
    currency TEXT DEFAULT 'EUR',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    renewal_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    stripe_subscription_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, user_id)
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Memberships viewable by organization" ON public.memberships FOR SELECT USING (
    user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.center_roles 
        WHERE organization_id = memberships.organization_id 
        AND user_id = auth.uid()
    )
);

-- 7. CENTER POSTS/FEED
CREATE TABLE IF NOT EXISTS public.center_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    post_type TEXT DEFAULT 'wod',
    image_urls TEXT[],
    video_url TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.center_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Center posts viewable if org is public" ON public.center_posts FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.organizations 
        WHERE id = center_posts.organization_id 
        AND is_public = true
    )
);

-- 8. CENTER STORE (E-Commerce)
CREATE TABLE IF NOT EXISTS public.center_products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price NUMERIC NOT NULL,
    cost NUMERIC,
    stock_quantity INTEGER DEFAULT 0,
    image_url TEXT,
    stripe_product_id TEXT UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.center_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Products viewable if org is public" ON public.center_products FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.organizations 
        WHERE id = center_products.organization_id 
        AND is_public = true
    )
);

-- 9. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'EUR',
    status TEXT DEFAULT 'pending',
    stripe_payment_intent_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Org can view its orders" ON public.orders FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.center_roles 
        WHERE organization_id = orders.organization_id 
        AND user_id = auth.uid()
    )
);

-- 10. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.center_products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL
);

-- 11. REVIEWS/RATINGS
CREATE TABLE IF NOT EXISTS public.center_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, user_id)
);

ALTER TABLE public.center_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Reviews viewable by everyone" ON public.center_reviews FOR SELECT USING (true);

-- Trigger para actualizar fecha de centro cuando se agrega review
CREATE OR REPLACE FUNCTION public.update_center_review_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.organizations 
    SET updated_at = now()
    WHERE id = NEW.organization_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER IF NOT EXISTS on_review_created AFTER INSERT ON public.center_reviews FOR EACH ROW EXECUTE PROCEDURE public.update_center_review_count();

-- 12. CENTER FOLLOWERS
CREATE TABLE IF NOT EXISTS public.center_followers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, user_id)
);

ALTER TABLE public.center_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Followers viewable by everyone" ON public.center_followers FOR SELECT USING (true);

-- Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_city ON public.organizations(city);
CREATE INDEX IF NOT EXISTS idx_center_roles_org_id ON public.center_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_center_roles_user_id ON public.center_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_classes_org_id ON public.classes(organization_id);
CREATE INDEX IF NOT EXISTS idx_trial_requests_org_id ON public.trial_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_id ON public.memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_center_posts_org_id ON public.center_posts(organization_id);

-- ✅ LISTO: Ahora ve a Supabase Table Editor y verifica que existan todas las tablas
