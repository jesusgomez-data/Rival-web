-- Los WODs publicados por un centro (tabla center_posts) no podían tener
-- resultados registrados: wod_completions.original_wod_post_id apunta con FK
-- solo a posts(id), así que cualquier intento de "Registrar Resultado" sobre
-- un WOD del muro de un gimnasio fallaba con "WOD no encontrado" (404) o,
-- si se sorteaba esa validación, con violación de FK al insertar.

-- 1. original_wod_post_id pasa a ser opcional: ahora un completion referencia
--    O un post personal O un center_post, nunca ninguno de los dos a la vez
--    pero nunca ambos vacíos (ver CHECK más abajo).
ALTER TABLE public.wod_completions
  ALTER COLUMN original_wod_post_id DROP NOT NULL;

-- 2. Nueva referencia opcional a center_posts.
ALTER TABLE public.wod_completions
  ADD COLUMN IF NOT EXISTS original_center_post_id UUID REFERENCES public.center_posts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_wod_completions_center_post ON public.wod_completions(original_center_post_id);

-- 3. Exactamente una de las dos referencias debe estar presente.
ALTER TABLE public.wod_completions
  DROP CONSTRAINT IF EXISTS wod_completions_one_source_check;
ALTER TABLE public.wod_completions
  ADD CONSTRAINT wod_completions_one_source_check
  CHECK (
    (original_wod_post_id IS NOT NULL AND original_center_post_id IS NULL)
    OR (original_wod_post_id IS NULL AND original_center_post_id IS NOT NULL)
  );

COMMENT ON COLUMN public.wod_completions.original_center_post_id IS 'WOD publicado por un centro (center_posts), alternativa a original_wod_post_id cuando el WOD no es de un post personal.';
