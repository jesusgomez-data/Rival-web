-- ═══════════════════════════════════════════════════════════════
-- center_products exponia la columna "cost" (coste de compra/margen)
-- a cualquiera sin login. Esa columna no se usa en ningun sitio de la
-- app (ni siquiera en el panel del dueño), asi que no hace falta
-- exponerla nunca — pero la tienda de cada centro SI debe seguir
-- siendo publica (nombre, precio, stock, fotos) para que un visitante
-- sin cuenta pueda verla antes de registrarse.
--
-- RLS no puede ocultar una columna sola, solo filas — por eso se cierra
-- la tabla real a dueño/staff y se crea una vista publica sin "cost".
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'center_products' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.center_products', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.center_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "center_products_owner_staff_all" ON public.center_products
    FOR ALL USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR organization_id IN (SELECT organization_id FROM public.center_roles WHERE user_id = auth.uid())
    ) WITH CHECK (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR organization_id IN (SELECT organization_id FROM public.center_roles WHERE user_id = auth.uid())
    );

CREATE OR REPLACE VIEW public.center_products_public AS
SELECT
    id, organization_id, center_id, name, description, category,
    price, stock_quantity, image_url, stripe_product_id, is_active,
    created_at, updated_at
FROM public.center_products;

GRANT SELECT ON public.center_products_public TO anon, authenticated;
