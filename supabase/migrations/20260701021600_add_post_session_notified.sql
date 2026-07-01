-- Añadir la columna post_session_notified
ALTER TABLE public.service_bookings ADD COLUMN IF NOT EXISTS post_session_notified BOOLEAN DEFAULT FALSE;

-- Función RPC para buscar reservas completadas no notificadas
CREATE OR REPLACE FUNCTION get_finished_unnotified_bookings()
RETURNS TABLE (
  booking_id UUID, 
  client_id UUID, 
  professional_user_id UUID, 
  service_name TEXT, 
  org_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id, 
    b.client_id, 
    org.owner_id, 
    b.service_name, 
    org.id
  FROM service_bookings b
  JOIN organizations org ON b.professional_id = org.id
  WHERE b.status = 'paid'
    AND b.post_session_notified = false
    AND b.scheduled_at IS NOT NULL
    AND b.scheduled_at + (b.duration_minutes || ' minutes')::interval < NOW();
END;
$$ LANGUAGE plpgsql;
