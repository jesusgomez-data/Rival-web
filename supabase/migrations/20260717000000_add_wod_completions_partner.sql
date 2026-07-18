-- Permite etiquetar a un compañero cuando un WOD se hizo en pareja.
-- El resultado sigue siendo UNA sola fila en wod_completions (registrada por
-- quien lo publica); partner_id solo referencia al segundo atleta para que
-- el leaderboard pueda mostrar los dos avatares juntos con el mismo resultado.

ALTER TABLE public.wod_completions
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wod_completions_partner ON public.wod_completions(partner_id);

COMMENT ON COLUMN public.wod_completions.partner_id IS 'Compañero etiquetado cuando el WOD se completó en pareja (opcional). El resultado es compartido entre user_id y partner_id.';
