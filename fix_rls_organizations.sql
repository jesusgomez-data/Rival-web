-- Fix RLS policy para permitir inserciones en organizations sin autenticación
-- Ejecutar en Supabase SQL Editor

-- Primero, ver las políticas actuales
-- SELECT * FROM pg_policies WHERE tablename = 'organizations';

-- Remover políticas que bloquean INSERT
DROP POLICY IF EXISTS "Owners manage their organization" ON public.organizations;

-- Crear nueva política que permite INSERT sin autenticación (para signup)
CREATE POLICY "Anyone can create organization" ON public.organizations 
  FOR INSERT 
  WITH CHECK (true);

-- Actualizar política de UPDATE/DELETE solo para owner
CREATE POLICY "Owners can manage their organization" ON public.organizations 
  FOR UPDATE 
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their organization" ON public.organizations 
  FOR DELETE 
  USING (auth.uid() = owner_id);

-- Mantener SELECT policies
-- "Public organizations are viewable by everyone" - ya existe
-- "Users can view their own organization" - ya existe
