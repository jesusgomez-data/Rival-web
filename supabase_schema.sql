-- RIVAL APP INITIAL SCHEMA V1.0 --

-- 1. Enable key extensions for UUIDs and Vector search (future proofing)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS (Extends Supabase Auth)
-- Stores public profiles and user metadata linked to auth.users
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3),
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    main_sport TEXT DEFAULT 'General',
    level TEXT DEFAULT 'Beginner', -- 'Beginner', 'Intermediate', 'Elite'
    gym_home TEXT,
    xp_points BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. WORKOUTS
-- Stores completed workout sessions
CREATE TABLE public.workouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL, -- e.g., "Leg Day Destruction", "Morning Run"
    notes TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    effort_rpe INTEGER CHECK (effort_rpe BETWEEN 1 AND 10), -- Rate of Perceived Exertion
    total_volume_kg NUMERIC,
    sport_type TEXT, -- 'CrossFit', 'Running', etc.
    location_name TEXT,
    is_pr BOOLEAN DEFAULT FALSE, -- Did they hit a PR in this session?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workouts viewable by everyone" ON public.workouts FOR SELECT USING (true);
CREATE POLICY "Users manage own workouts" ON public.workouts FOR ALL USING (auth.uid() = user_id);

-- 4. EXERCISES (Catalog)
-- Master list of exercises (Squat, Bench, etc.)
CREATE TABLE public.exercises_catalog (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    category TEXT, -- 'Strength', 'Cardio', 'Plyo'
    muscle_group TEXT, -- 'Legs', 'Chest', etc.
    video_url TEXT, -- Tutorial video
    is_custom BOOLEAN DEFAULT FALSE -- Can be user created
);

-- Seed initial exercises
INSERT INTO public.exercises_catalog (name, category, muscle_group) VALUES
('Back Squat', 'Strength', 'Legs'),
('Deadlift', 'Strength', 'Posterior Chain'),
('Bench Press', 'Strength', 'Chest'),
('Pull Up', 'Strength', 'Back'),
('Running', 'Cardio', 'Full Body'),
('Burpee', 'Conditioning', 'Full Body');

-- 5. WORKOUT LOGS (Sets)
-- Detailed sets within a workout
CREATE TABLE public.workout_sets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
    exercise_name TEXT NOT NULL, -- Copied from catalog for ease
    set_order INTEGER NOT NULL,
    weight_kg NUMERIC,
    reps INTEGER,
    distance_meters NUMERIC,
    time_seconds INTEGER,
    is_pr BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sets viewable by everyone" ON public.workout_sets FOR SELECT USING (true);
CREATE POLICY "Users manage own sets" ON public.workout_sets FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_sets.workout_id AND user_id = auth.uid())
);

-- 6. POSTS (The Social Feed)
-- Links to a workout OR a standalone photo/video
CREATE TABLE public.posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL, -- Optional link to workout data
    caption TEXT,
    media_url TEXT, -- Image or Video
    media_type TEXT, -- 'image' or 'video'
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users manage own posts" ON public.posts FOR ALL USING (auth.uid() = user_id);

-- 7. LIKES & COMMENTS (Interactions)
CREATE TABLE public.likes (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read likes" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- 8. FOLLOWS (Rivalry System)
CREATE TABLE public.follows (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT cannot_follow_self CHECK (follower_id <> following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can see follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);

-- 9. TRIGGERS & FUNCTIONS FOR AUTOMATION --

-- Automatic counts for likes
CREATE OR REPLACE FUNCTION public.handle_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_change
    AFTER INSERT OR DELETE ON public.likes
    FOR EACH ROW EXECUTE PROCEDURE public.handle_like_count();

-- XP Rewards System
CREATE OR REPLACE FUNCTION public.reward_xp()
RETURNS TRIGGER AS $$
BEGIN
    -- Reward XP for liking a post (small)
    IF (TG_TABLE_NAME = 'likes' AND TG_OP = 'INSERT') THEN
        UPDATE public.profiles SET xp_points = xp_points + 5 WHERE id = NEW.user_id;
    END IF;
    
    -- Reward XP for following someone (rivalry starter)
    IF (TG_TABLE_NAME = 'follows' AND TG_OP = 'INSERT') THEN
        UPDATE public.profiles SET xp_points = xp_points + 10 WHERE id = NEW.follower_id;
    END IF;

    -- Reward XP for completing a workout (big)
    IF (TG_TABLE_NAME = 'workouts' AND TG_OP = 'INSERT') THEN
        UPDATE public.profiles SET xp_points = xp_points + 100 WHERE id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_reward_xp AFTER INSERT ON public.likes FOR EACH ROW EXECUTE PROCEDURE public.reward_xp();
CREATE TRIGGER on_follow_reward_xp AFTER INSERT ON public.follows FOR EACH ROW EXECUTE PROCEDURE public.reward_xp();
CREATE TRIGGER on_workout_reward_xp AFTER INSERT ON public.workouts FOR EACH ROW EXECUTE PROCEDURE public.reward_xp();

-- This function automatically creates a profile when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id, 
    LOWER(SPLIT_PART(new.email, '@', 1)), -- Default username from email
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Profile update trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
-- ============================================
-- B2B SECTION: CENTERS & GYMS (NEW PHASE)
-- ============================================

-- 1. ORGANIZATIONS/CENTERS
-- Main table for gym/center entities
CREATE TABLE public.organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    center_type TEXT NOT NULL, -- 'crossfit', 'gym', 'running', 'yoga', 'padel', 'dance', 'other'
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    website TEXT,
    plan TEXT DEFAULT 'free', -- 'free', 'starter', 'pro', 'enterprise'
    verified BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE, -- Visible in discovery
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
CREATE POLICY "Public organizations are viewable by everyone" ON public.organizations FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own organization" ON public.organizations FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners manage their organization" ON public.organizations FOR ALL USING (auth.uid() = owner_id);

-- 2. CENTER ROLES & PERMISSIONS
-- Maps users to organizations with specific roles
CREATE TABLE public.center_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL, -- 'head_coach', 'coach', 'member', 'lead'
    permissions TEXT[] DEFAULT ARRAY[]::TEXT[], -- e.g., ['manage_classes', 'see_analytics']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, user_id)
);

ALTER TABLE public.center_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view center roles" ON public.center_roles FOR SELECT USING (true);
CREATE POLICY "Head coaches manage center roles" ON public.center_roles FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.center_roles 
        WHERE organization_id = center_roles.organization_id 
        AND user_id = auth.uid() 
        AND role = 'head_coach'
    ));

-- 3. CLASSES/SESSIONS
-- Schedule and details of classes
CREATE TABLE public.classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL, -- e.g., "Básico", "Avanzado"
    description TEXT,
    class_type TEXT, -- 'group', 'private'
    difficulty TEXT, -- 'beginner', 'intermediate', 'advanced'
    max_capacity INTEGER DEFAULT 30,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_days TEXT[], -- e.g., ['Monday', 'Wednesday', 'Friday']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Classes viewable by organization members" ON public.classes FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.center_roles 
        WHERE organization_id = classes.organization_id 
        AND user_id = auth.uid()
    )
);

-- 4. CLASS ENROLLMENTS
-- Track who is enrolled in which class
CREATE TABLE public.class_enrollments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    attended BOOLEAN DEFAULT FALSE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(class_id, user_id)
);

ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view enrollments" ON public.class_enrollments FOR SELECT USING (true);
CREATE POLICY "Users can manage own enrollments" ON public.class_enrollments FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 5. TRIAL CLASSES (LEAD MANAGEMENT)
-- Requests from users to try a class
CREATE TABLE public.trial_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'attended', 'converted'
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
CREATE POLICY "Trial requests viewable by organization" ON public.trial_requests FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.center_roles 
        WHERE organization_id = trial_requests.organization_id 
        AND user_id = auth.uid()
    ) OR user_id = auth.uid()
);

-- 6. MEMBERSHIPS
-- Subscription plans for a center
CREATE TABLE public.memberships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    membership_type TEXT, -- 'unlimited', '10_pack', 'personal_training'
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
CREATE POLICY "Memberships viewable by organization" ON public.memberships FOR SELECT USING (
    user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.center_roles 
        WHERE organization_id = memberships.organization_id 
        AND user_id = auth.uid()
    )
);

-- 7. CENTER POSTS/FEED (Social Network)
-- Allows centers to post WODs, announcements, etc.
CREATE TABLE public.center_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    post_type TEXT DEFAULT 'wod', -- 'wod', 'announcement', 'event', 'testimonial'
    image_urls TEXT[], -- Array of URLs
    video_url TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.center_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center posts viewable if org is public" ON public.center_posts FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.organizations 
        WHERE id = center_posts.organization_id 
        AND is_public = true
    )
);

-- 8. CENTER STORE (E-Commerce)
-- Products sold by center
CREATE TABLE public.center_products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- 'merch', 'supplements', 'classes', 'services'
    price NUMERIC NOT NULL,
    cost NUMERIC, -- For profit calculation
    stock_quantity INTEGER DEFAULT 0,
    image_url TEXT,
    stripe_product_id TEXT UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.center_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products viewable if org is public" ON public.center_products FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.organizations 
        WHERE id = center_products.organization_id 
        AND is_public = true
    )
);

-- 9. ORDERS
-- Track purchases from center stores
CREATE TABLE public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'EUR',
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'shipped', 'refunded'
    stripe_payment_intent_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Org can view its orders" ON public.orders FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.center_roles 
        WHERE organization_id = orders.organization_id 
        AND user_id = auth.uid()
    )
);

-- 10. ORDER ITEMS
-- Details of items in an order
CREATE TABLE public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.center_products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL
);

-- 11. REVIEWS/RATINGS
-- Users can review centers
CREATE TABLE public.center_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, user_id)
);

ALTER TABLE public.center_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews viewable by everyone" ON public.center_reviews FOR SELECT USING (true);

-- Trigger to update center's reviews count
CREATE OR REPLACE FUNCTION public.update_center_review_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.organizations 
    SET updated_at = now()
    WHERE id = NEW.organization_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_created AFTER INSERT ON public.center_reviews FOR EACH ROW EXECUTE PROCEDURE public.update_center_review_count();

-- 12. CENTER FOLLOWERS
-- Users can follow centers
CREATE TABLE public.center_followers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, user_id)
);

ALTER TABLE public.center_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Followers viewable by everyone" ON public.center_followers FOR SELECT USING (true);