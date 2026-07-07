-- =====================================================================
-- RIVAL FIT — Fix: RLS de 'profiles' no respeta privacy_setting
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- Fecha: 2026-07-07
-- =====================================================================
--
-- PROBLEMA CONFIRMADO (probado y revertido en vivo):
--   La política de SELECT vigente en profiles es la original y permisiva:
--     CREATE POLICY "Public profiles are viewable by everyone"
--       ON public.profiles FOR SELECT USING (true);
--   Esto permite leer CUALQUIER fila de profiles con el rol anon,
--   sin importar el valor de privacy_setting ('public'/'private').
--
--   Existe en el repo una versión más estricta (supabase_rls_secure.sql)
--   pero nunca quedó aplicada correctamente, y además referencia una
--   columna `is_public` que NO EXISTE en la tabla (la columna real es
--   `privacy_setting`).
--
--   Las columnas sensibles (phone/email/birth_date/stripe_customer_id)
--   SÍ están protegidas por el GRANT column-level de SECURITY_HARDENING.sql
--   y no se ven afectadas por este fix — esto solo corrige el filtro de
--   FILAS (perfiles privados enteros visibles por error).
-- =====================================================================

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are discoverable" ON public.profiles;

CREATE POLICY "Public profiles are discoverable"
ON public.profiles
FOR SELECT
USING (
  privacy_setting = 'public'
  OR id = auth.uid()
  OR is_official = true
);

-- =====================================================================
-- VERIFICACION (reversible, no deja cambios permanentes):
--   node -e "
--     const { createClient } = require('@supabase/supabase-js');
--     require('dotenv').config({ path: '.env.local' });
--     const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
--     const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
--     const ID = '9953e41a-1eab-4e96-bfca-c4374ad57fff'; // testuser
--     (async () => {
--       await admin.from('profiles').update({ privacy_setting: 'private' }).eq('id', ID);
--       const { data } = await anon.from('profiles').select('id').eq('id', ID);
--       console.log('Anon ve el perfil privado:', data.length > 0 ? 'SI (mal)' : 'NO (bien)');
--       await admin.from('profiles').update({ privacy_setting: 'public' }).eq('id', ID);
--     })();
--   "
-- Debe imprimir "NO (bien)". Después de aplicar este fix, vuelve a correr
-- ese comando para confirmar.
-- =====================================================================
