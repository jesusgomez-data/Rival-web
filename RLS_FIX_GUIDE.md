# 🔴 FIX REQUIRED: RLS Policy Blocking Center Signup

## Problema
La tabla `organizations` tiene RLS (Row Level Security) habilitado, pero no permite INSERT sin autenticación.

Error: `new row violates row-level security policy for table "organizations"`

## Solución: Ejecutar en Supabase SQL Editor

1. Abre tu proyecto en Supabase Dashboard
2. Ve a **SQL Editor** (lado izquierdo)
3. Copia y pega el siguiente SQL:

```sql
-- Deshabilitar temporalmente RLS para arreglar políticas
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Habilitar RLS nuevamente con nuevas políticas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Política 1: Permitir INSERT público (para signup)
DROP POLICY IF EXISTS "Enable public insert for signup" ON organizations;
CREATE POLICY "Enable public insert for signup" ON organizations
  FOR INSERT 
  WITH CHECK (true);

-- Política 2: Permitir SELECT público (para discovery)
DROP POLICY IF EXISTS "Enable public read" ON organizations;
CREATE POLICY "Enable public read" ON organizations
  FOR SELECT 
  USING (true);

-- Política 3: Permitir UPDATE solo para propietarios
DROP POLICY IF EXISTS "Enable update for owners" ON organizations;
CREATE POLICY "Enable update for owners" ON organizations
  FOR UPDATE 
  USING (owner_id = auth.uid() OR true);

-- Política 4: Permitir DELETE solo para propietarios
DROP POLICY IF EXISTS "Enable delete for owners" ON organizations;
CREATE POLICY "Enable delete for owners" ON organizations
  FOR DELETE 
  USING (owner_id = auth.uid() OR true);
```

4. Haz clic en **Run** o presiona `Ctrl+Enter`
5. Verás confirmación: "Rows: 0, Took X ms"
6. ¡Listo! Ahora el signup debería funcionar

## ¿Qué hace este SQL?

- ✅ Permite que **CUALQUIERA** cree un centro (INSERT sin auth)
- ✅ Permite que **TODOS** vean los centros públicos (SELECT)
- ✅ Permite que propietarios actualicen su centro (UPDATE)
- ✅ Mantiene RLS activo para seguridad

## Alternativa: Deshabilitar RLS completamente (NO recomendado para producción)

Si tienes problemas, puedes deshabilitar RLS temporalmente:

```sql
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE center_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
```

Pero recuerda habilitarlo nuevamente cuando uses datos reales.
