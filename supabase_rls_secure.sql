-- ============================================
-- RIVALFIT - SECURE RLS POLICIES
-- Versión: 2.0 - Multi-País Security
-- Fecha: 2026-03-05
-- ============================================

-- ============================================
-- 1. ORGANIZATIONS TABLE
-- ============================================

-- Habilitar RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas antiguas
DROP POLICY IF EXISTS "Enable public insert for signup" ON organizations;
DROP POLICY IF EXISTS "Enable public read" ON organizations;
DROP POLICY IF EXISTS "Enable update for owners" ON organizations;
DROP POLICY IF EXISTS "Enable delete for owners" ON organizations;

-- POLÍTICA 1: INSERT - Solo usuarios autenticados pueden crear organizaciones
CREATE POLICY "Authenticated users can create organizations"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = owner_id
);

-- POLÍTICA 2: SELECT - Organizaciones públicas visibles para todos
CREATE POLICY "Public organizations are visible to all"
ON organizations
FOR SELECT
USING (
  is_public = true
  OR
  auth.uid() = owner_id
);

-- POLÍTICA 3: UPDATE - Solo propietarios pueden actualizar
CREATE POLICY "Owners can update their organizations"
ON organizations
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- POLÍTICA 4: DELETE - Solo propietarios pueden eliminar
CREATE POLICY "Owners can delete their organizations"
ON organizations
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- ============================================
-- 2. CENTERS TABLE
-- ============================================

ALTER TABLE centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public centers visible" ON centers;
DROP POLICY IF EXISTS "Org owners manage centers" ON centers;

-- Centros públicos visibles para todos
CREATE POLICY "Public centers are discoverable"
ON centers
FOR SELECT
USING (status = 'active');

-- Solo miembros de la organización pueden crear/modificar centros
CREATE POLICY "Org members can manage centers"
ON centers
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM center_roles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM center_roles WHERE user_id = auth.uid()
  )
);

-- ============================================
-- 3. CENTER_ROLES TABLE
-- ============================================

ALTER TABLE center_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own roles" ON center_roles;
DROP POLICY IF EXISTS "Head coaches manage roles" ON center_roles;

-- Usuarios pueden ver sus propios roles
CREATE POLICY "Users can view their own roles"
ON center_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Head coaches pueden gestionar roles de su organización
CREATE POLICY "Head coaches can manage roles"
ON center_roles
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM center_roles
    WHERE user_id = auth.uid() AND role = 'head_coach'
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM center_roles
    WHERE user_id = auth.uid() AND role = 'head_coach'
  )
);

-- ============================================
-- 4. CLASSES TABLE
-- ============================================

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public classes viewable" ON classes;
DROP POLICY IF EXISTS "Coaches manage classes" ON classes;

-- Clases públicas visibles para todos
CREATE POLICY "Public classes are discoverable"
ON classes
FOR SELECT
USING (is_public = true);

-- Coaches pueden gestionar clases de sus centros
CREATE POLICY "Coaches can manage their classes"
ON classes
FOR ALL
TO authenticated
USING (
  center_id IN (
    SELECT c.id FROM centers c
    JOIN center_roles cr ON cr.organization_id = c.organization_id
    WHERE cr.user_id = auth.uid()
      AND cr.role IN ('head_coach', 'coach')
  )
)
WITH CHECK (
  center_id IN (
    SELECT c.id FROM centers c
    JOIN center_roles cr ON cr.organization_id = c.organization_id
    WHERE cr.user_id = auth.uid()
      AND cr.role IN ('head_coach', 'coach')
  )
);

-- ============================================
-- 5. CLASS_ENROLLMENTS TABLE
-- ============================================

ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own enrollments" ON class_enrollments;
DROP POLICY IF EXISTS "Coaches view their class enrollments" ON class_enrollments;

-- Usuarios ven sus propias inscripciones
CREATE POLICY "Users can view their enrollments"
ON class_enrollments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Coaches ven inscripciones de sus clases
CREATE POLICY "Coaches can view class enrollments"
ON class_enrollments
FOR SELECT
TO authenticated
USING (
  class_id IN (
    SELECT cl.id FROM classes cl
    JOIN centers c ON c.id = cl.center_id
    JOIN center_roles cr ON cr.organization_id = c.organization_id
    WHERE cr.user_id = auth.uid()
  )
);

-- Usuarios pueden inscribirse a clases
CREATE POLICY "Users can enroll in classes"
ON class_enrollments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================
-- 6. PROFILES TABLE (Critical for Privacy)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles viewable" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;

-- Perfiles públicos visibles para todos
CREATE POLICY "Public profiles are discoverable"
ON profiles
FOR SELECT
USING (is_public = true OR id = auth.uid());

-- Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Permitir INSERT en profiles (para signup)
CREATE POLICY "Users can create their own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- ============================================
-- 7. TRIAL_REQUESTS TABLE (Lead Management)
-- ============================================

ALTER TABLE trial_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can request trial" ON trial_requests;
DROP POLICY IF EXISTS "Centers see their trials" ON trial_requests;

-- Cualquier usuario autenticado puede solicitar prueba
CREATE POLICY "Authenticated users can request trials"
ON trial_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Usuarios ven sus propias solicitudes
CREATE POLICY "Users view their own trial requests"
ON trial_requests
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Centros ven solicitudes dirigidas a ellos
CREATE POLICY "Centers can view their trial requests"
ON trial_requests
FOR SELECT
TO authenticated
USING (
  center_id IN (
    SELECT c.id FROM centers c
    JOIN center_roles cr ON cr.organization_id = c.organization_id
    WHERE cr.user_id = auth.uid()
  )
);

-- Head coaches pueden aprobar/rechazar
CREATE POLICY "Head coaches can manage trial requests"
ON trial_requests
FOR UPDATE
TO authenticated
USING (
  center_id IN (
    SELECT c.id FROM centers c
    JOIN center_roles cr ON cr.organization_id = c.organization_id
    WHERE cr.user_id = auth.uid() AND cr.role = 'head_coach'
  )
);

-- ============================================
-- 8. ORDERS TABLE (E-commerce Security)
-- ============================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own orders" ON orders;
DROP POLICY IF EXISTS "Centers view their orders" ON orders;

-- Usuarios ven sus propias órdenes
CREATE POLICY "Users can view their own orders"
ON orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Centros ven órdenes de sus productos
CREATE POLICY "Centers can view orders of their products"
ON orders
FOR SELECT
TO authenticated
USING (
  center_id IN (
    SELECT c.id FROM centers c
    JOIN center_roles cr ON cr.organization_id = c.organization_id
    WHERE cr.user_id = auth.uid()
  )
);

-- ============================================
-- 9. SECURITY FUNCTIONS
-- ============================================

-- Función: Verificar si usuario es head coach de una organización
CREATE OR REPLACE FUNCTION is_head_coach(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM center_roles
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role = 'head_coach'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Verificar si usuario tiene permiso específico
CREATE OR REPLACE FUNCTION has_permission(org_id UUID, permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM center_roles
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND permission = ANY(permissions)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. AUDIT TRIGGERS (Compliance & GDPR)
-- ============================================

-- Crear tabla de auditoría
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Función genérica de auditoría
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, operation, user_id, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a tablas críticas
DROP TRIGGER IF EXISTS audit_organizations ON organizations;
CREATE TRIGGER audit_organizations
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- ============================================
-- 11. RATE LIMITING (Database Level)
-- ============================================

-- Crear extensión para rate limiting
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Tabla de rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  request_count INT DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Función para verificar rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  endpoint_name TEXT,
  max_requests INT,
  window_seconds INT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INT;
BEGIN
  -- Limpiar ventanas expiradas
  DELETE FROM rate_limits
  WHERE window_start < NOW() - (window_seconds || ' seconds')::INTERVAL;

  -- Obtener cuenta actual
  SELECT request_count INTO current_count
  FROM rate_limits
  WHERE user_id = auth.uid()
    AND endpoint = endpoint_name
    AND window_start > NOW() - (window_seconds || ' seconds')::INTERVAL;

  -- Si no existe, crear
  IF current_count IS NULL THEN
    INSERT INTO rate_limits (user_id, endpoint, request_count)
    VALUES (auth.uid(), endpoint_name, 1);
    RETURN TRUE;
  END IF;

  -- Si excede límite, rechazar
  IF current_count >= max_requests THEN
    RETURN FALSE;
  END IF;

  -- Incrementar contador
  UPDATE rate_limits
  SET request_count = request_count + 1
  WHERE user_id = auth.uid() AND endpoint = endpoint_name;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Listar todas las políticas RLS activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

COMMENT ON TABLE organizations IS 'RLS v2.0 - Secure multi-country policies applied';
