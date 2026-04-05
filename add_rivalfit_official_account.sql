-- ============================================================
-- RIVALFIT OFFICIAL ACCOUNT SETUP
-- ============================================================

INSERT INTO public.profiles (
  id,
  username,
  full_name,
  avatar_url,
  cover_url,
  bio,
  is_official,
  main_sport,
  level,
  streak_days,
  created_at,
  updated_at
) VALUES (
  '31e0170f-0d5f-4557-b93d-02f16b75f7d5',
  'rivalfit',
  'RivalFit',
  'https://ralskslspvskjqqgzbiv.supabase.co/storage/v1/object/public/avatars/rivalfit-logo.png',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop',
  'La red social definitiva para atletas híbridos. Registra tus WODs, compite con la comunidad y domina tu rendimiento. 🏋️ rivalfit.app',
  true,
  'Hybrid Training',
  99,
  365,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  username = 'rivalfit',
  full_name = 'RivalFit',
  is_official = true,
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url,
  cover_url = EXCLUDED.cover_url,
  level = 99,
  updated_at = now();

-- Verify
SELECT id, username, full_name, is_official, bio FROM public.profiles WHERE id = '31e0170f-0d5f-4557-b93d-02f16b75f7d5';
