-- Add Stripe billing columns to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Add Stripe billing columns to Organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Ensure RLS allows updates to these columns by the user (or service role logic)
-- Existing policies allow users to update their own profile, which is fine.
-- Service role (webhooks) bypasses RLS, so that's fine too.
