-- Migration: WOD Completions & Leaderboard System
-- Permite a los usuarios "hacer" WODs de otros y crear rankings compartidos

-- ============================================
-- 1. TABLA DE COMPLETADOS (WOD Completions)
-- ============================================

CREATE TABLE IF NOT EXISTS public.wod_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencias
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  original_wod_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  completion_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL, -- Post donde publicó su resultado

  -- Resultados del WOD
  completion_type TEXT NOT NULL CHECK (completion_type IN ('time', 'rounds', 'reps', 'weight', 'score')),

  -- Para WODs "For Time" (completar lo más rápido posible)
  completion_time_seconds INTEGER, -- Tiempo en segundos (ej: 12:30 = 750 segundos)

  -- Para WODs "AMRAP" (máximas rondas en tiempo fijo)
  rounds_completed DECIMAL(5,2), -- Ej: 8.5 rounds (8 completas + media ronda)

  -- Para WODs de repeticiones
  total_reps INTEGER, -- Total de repeticiones completadas

  -- Para WODs de fuerza (peso levantado)
  weight_kg DECIMAL(6,2), -- Peso en kg

  -- Puntuación general (para WODs personalizados)
  score INTEGER, -- Puntuación general (0-1000)

  -- Metadata
  notes TEXT, -- Notas del usuario (modificaciones, sensaciones, etc.)
  rx BOOLEAN DEFAULT true, -- ¿Lo hizo Rx (como está prescrito) o scaled?

  -- Timestamps
  started_at TIMESTAMPTZ, -- Cuándo empezó el WOD
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, -- Cuándo lo terminó
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================

-- Buscar completions por usuario
CREATE INDEX idx_wod_completions_user ON public.wod_completions(user_id);

-- Buscar todos los que hicieron un WOD específico (para leaderboard)
CREATE INDEX idx_wod_completions_wod ON public.wod_completions(original_wod_post_id);

-- Ordenar leaderboard por tiempo (For Time WODs)
CREATE INDEX idx_wod_completions_time ON public.wod_completions(original_wod_post_id, completion_time_seconds)
  WHERE completion_type = 'time';

-- Ordenar leaderboard por rounds (AMRAP WODs)
CREATE INDEX idx_wod_completions_rounds ON public.wod_completions(original_wod_post_id, rounds_completed DESC)
  WHERE completion_type = 'rounds';

-- ============================================
-- 3. AGREGAR COLUMNA DE CONTADOR A POSTS
-- ============================================

-- Agregar contador de cuántas personas completaron el WOD
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS completions_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_posts_completions ON public.posts(completions_count DESC)
  WHERE post_type = 'wod';

-- ============================================
-- 4. TRIGGER PARA ACTUALIZAR CONTADOR
-- ============================================

-- Función para actualizar el contador de completions
CREATE OR REPLACE FUNCTION update_wod_completions_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Incrementar contador cuando alguien completa un WOD
    UPDATE public.posts
    SET completions_count = completions_count + 1
    WHERE id = NEW.original_wod_post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrementar contador cuando se borra una completion
    UPDATE public.posts
    SET completions_count = GREATEST(0, completions_count - 1)
    WHERE id = OLD.original_wod_post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger que ejecuta la función
DROP TRIGGER IF EXISTS trigger_update_wod_completions_count ON public.wod_completions;
CREATE TRIGGER trigger_update_wod_completions_count
  AFTER INSERT OR DELETE ON public.wod_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_wod_completions_count();

-- ============================================
-- 5. RLS POLICIES (Row Level Security)
-- ============================================

ALTER TABLE public.wod_completions ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver las completions (para leaderboards públicos)
CREATE POLICY "WOD completions are viewable by everyone"
  ON public.wod_completions
  FOR SELECT
  USING (true);

-- Solo el usuario puede crear sus propias completions
CREATE POLICY "Users can create own completions"
  ON public.wod_completions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Solo el usuario puede editar/borrar sus propias completions
CREATE POLICY "Users can update own completions"
  ON public.wod_completions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions"
  ON public.wod_completions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. VISTAS PARA LEADERBOARDS
-- ============================================

-- Vista para leaderboard de WODs "For Time" (menor tiempo = mejor)
CREATE OR REPLACE VIEW wod_leaderboard_time AS
SELECT
  c.id,
  c.original_wod_post_id,
  c.user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  c.completion_time_seconds,
  c.rx,
  c.notes,
  c.completed_at,
  ROW_NUMBER() OVER (
    PARTITION BY c.original_wod_post_id
    ORDER BY c.completion_time_seconds ASC
  ) as rank
FROM public.wod_completions c
JOIN public.profiles p ON c.user_id = p.id
WHERE c.completion_type = 'time'
  AND c.completion_time_seconds IS NOT NULL;

-- Vista para leaderboard de WODs "AMRAP" (más rounds = mejor)
CREATE OR REPLACE VIEW wod_leaderboard_rounds AS
SELECT
  c.id,
  c.original_wod_post_id,
  c.user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  c.rounds_completed,
  c.rx,
  c.notes,
  c.completed_at,
  ROW_NUMBER() OVER (
    PARTITION BY c.original_wod_post_id
    ORDER BY c.rounds_completed DESC
  ) as rank
FROM public.wod_completions c
JOIN public.profiles p ON c.user_id = p.id
WHERE c.completion_type = 'rounds'
  AND c.rounds_completed IS NOT NULL;

-- ============================================
-- 7. FUNCIONES HELPER
-- ============================================

-- Función para obtener el ranking de un usuario en un WOD específico
CREATE OR REPLACE FUNCTION get_user_rank_in_wod(
  p_user_id UUID,
  p_wod_post_id UUID
)
RETURNS TABLE (
  rank BIGINT,
  total_completions BIGINT,
  percentile NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT
      user_id,
      ROW_NUMBER() OVER (
        ORDER BY
          CASE completion_type
            WHEN 'time' THEN completion_time_seconds
            ELSE NULL
          END ASC,
          CASE completion_type
            WHEN 'rounds' THEN rounds_completed
            ELSE NULL
          END DESC
      ) as user_rank
    FROM wod_completions
    WHERE original_wod_post_id = p_wod_post_id
  ),
  totals AS (
    SELECT COUNT(*) as total FROM ranked
  )
  SELECT
    r.user_rank,
    t.total,
    ROUND((r.user_rank::NUMERIC / t.total::NUMERIC) * 100, 1) as percentile
  FROM ranked r
  CROSS JOIN totals t
  WHERE r.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE public.wod_completions IS 'Registro de WODs completados por usuarios, usado para crear leaderboards compartidos';
COMMENT ON COLUMN public.wod_completions.rx IS 'Rx = como está prescrito (sin modificaciones), Scaled = con modificaciones/peso reducido';
COMMENT ON COLUMN public.wod_completions.completion_time_seconds IS 'Tiempo total en segundos (para WODs For Time)';
COMMENT ON COLUMN public.wod_completions.rounds_completed IS 'Rondas completadas con decimal (ej: 8.5 = 8 rondas completas + media ronda)';
