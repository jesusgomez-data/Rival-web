-- Lista todas las políticas RLS activas sobre 'profiles' (todas las
-- operaciones), incluyendo su nombre real, el comando (SELECT/UPDATE/...)
-- y la condición USING/WITH CHECK. Pega el resultado completo.

SELECT
  policyname,
  cmd,
  permissive,
  roles,
  qual AS using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';
