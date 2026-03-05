/**
 * RIVALFIT - Global Pass System
 * Membresía multi-centro para entrenar en cualquier gimnasio de la red
 */

import { createClient } from "@/utils/supabase/client";

// ============================================
// TIPOS
// ============================================

export type PassTier = "basic" | "premium" | "elite";

export interface GlobalPassPricing {
  tier: PassTier;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  maxVisitsPerMonth: number;
  features: string[];
  restrictions?: string[];
}

export interface GlobalPassMembership {
  id: string;
  userId: string;
  tier: PassTier;
  startDate: string;
  expiryDate: string;
  status: "active" | "suspended" | "expired";
  visitsThisMonth: number;
  homeGym?: {
    id: string;
    name: string;
  };
}

export interface PartnerGym {
  id: string;
  name: string;
  type: string;
  city: string;
  country: string;
  rating: number;
  totalMembers: number;
  amenities: string[];
  isVerified: boolean;
  distanceKm?: number; // Distancia desde ubicación del usuario
  passAllowed: PassTier[]; // Qué tiers de pass acepta
}

// ============================================
// PRICING POR TIER
// ============================================

export const GLOBAL_PASS_PRICING: Record<PassTier, GlobalPassPricing> = {
  basic: {
    tier: "basic",
    name: "Global Pass Basic",
    monthlyPrice: 79.99,
    yearlyPrice: 799.99,
    currency: "EUR",
    maxVisitsPerMonth: 12,
    features: [
      "Acceso a 500+ gimnasios en Europa",
      "Hasta 12 visitas al mes",
      "App móvil incluida",
      "Check-in con QR",
      "Sin compromiso de permanencia",
    ],
    restrictions: [
      "No incluye clases premium",
      "Sujeto a disponibilidad",
    ],
  },
  premium: {
    tier: "premium",
    name: "Global Pass Premium",
    monthlyPrice: 149.99,
    yearlyPrice: 1499.99,
    currency: "EUR",
    maxVisitsPerMonth: 30,
    features: [
      "Acceso ilimitado a 1,000+ gimnasios",
      "Hasta 30 visitas al mes",
      "Clases premium incluidas",
      "Prioridad en reservas",
      "1 invitado gratis por mes",
      "Descuentos en merchandising (15%)",
    ],
  },
  elite: {
    tier: "elite",
    name: "Global Pass Elite",
    monthlyPrice: 299.99,
    yearlyPrice: 2999.99,
    currency: "EUR",
    maxVisitsPerMonth: 999, // Ilimitado
    features: [
      "Acceso ILIMITADO global",
      "2,000+ gimnasios en Europa + USA",
      "Sin límite de visitas",
      "Clases premium + eventos especiales",
      "3 invitados gratis por mes",
      "Descuentos 25% en todo",
      "Soporte VIP 24/7",
      "Entrenador personal (4 sesiones/mes)",
    ],
  },
};

// ============================================
// CLASE GLOBAL PASS
// ============================================

export class GlobalPassService {
  private supabase = createClient();

  /**
   * Verificar si un usuario tiene Global Pass activo
   */
  async hasActivePass(userId: string): Promise<GlobalPassMembership | null> {
    const { data, error } = await this.supabase
      .from("global_pass_memberships")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .gte("expiry_date", new Date().toISOString())
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      tier: data.tier,
      startDate: data.start_date,
      expiryDate: data.expiry_date,
      status: data.status,
      visitsThisMonth: data.visits_this_month || 0,
      homeGym: data.home_gym_id
        ? {
            id: data.home_gym_id,
            name: data.home_gym_name || "Gimnasio",
          }
        : undefined,
    };
  }

  /**
   * Obtener gimnasios disponibles para Global Pass
   */
  async getPartnerGyms(
    userLocation?: { lat: number; lng: number },
    filters?: {
      city?: string;
      country?: string;
      type?: string;
      minRating?: number;
    }
  ): Promise<PartnerGym[]> {
    let query = this.supabase
      .from("organizations")
      .select(
        `
        id,
        name,
        center_type,
        city,
        country,
        verified,
        member_count,
        bio,
        global_pass_enabled,
        global_pass_tiers
      `
      )
      .eq("global_pass_enabled", true)
      .eq("is_public", true);

    if (filters?.city) query = query.eq("city", filters.city);
    if (filters?.country) query = query.eq("country", filters.country);
    if (filters?.type) query = query.eq("center_type", filters.type);

    const { data, error } = await query.limit(100);

    if (error || !data) return [];

    // Transformar y calcular distancia si hay ubicación
    const gyms: PartnerGym[] = data.map((gym: any) => ({
      id: gym.id,
      name: gym.name,
      type: gym.center_type || "gym",
      city: gym.city,
      country: gym.country,
      rating: 4.5, // TODO: Calcular rating real
      totalMembers: gym.member_count || 0,
      amenities: [], // TODO: Agregar amenities
      isVerified: gym.verified || false,
      passAllowed: gym.global_pass_tiers || ["basic", "premium", "elite"],
      distanceKm: userLocation
        ? this.calculateDistance(
            userLocation.lat,
            userLocation.lng,
            0, // TODO: Guardar lat/lng del gym
            0
          )
        : undefined,
    }));

    return gyms;
  }

  /**
   * Registrar visita a un gimnasio con Global Pass
   */
  async checkInWithPass(
    userId: string,
    gymId: string,
    classId?: string
  ): Promise<{
    success: boolean;
    message: string;
    visitsRemaining?: number;
  }> {
    // 1. Verificar que tenga pass activo
    const pass = await this.hasActivePass(userId);
    if (!pass) {
      return {
        success: false,
        message: "No tienes un Global Pass activo",
      };
    }

    // 2. Verificar límite de visitas
    const pricing = GLOBAL_PASS_PRICING[pass.tier];
    if (pass.visitsThisMonth >= pricing.maxVisitsPerMonth) {
      return {
        success: false,
        message: `Has alcanzado el límite de ${pricing.maxVisitsPerMonth} visitas este mes`,
      };
    }

    // 3. Verificar que el gym acepta este tier
    const gym = await this.supabase
      .from("organizations")
      .select("global_pass_tiers")
      .eq("id", gymId)
      .single();

    if (
      gym.data &&
      !gym.data.global_pass_tiers.includes(pass.tier)
    ) {
      return {
        success: false,
        message: "Este gimnasio no acepta tu tier de Global Pass",
      };
    }

    // 4. Registrar check-in
    const { error: checkInError } = await this.supabase
      .from("global_pass_visits")
      .insert({
        membership_id: pass.id,
        gym_id: gymId,
        class_id: classId,
        checked_in_at: new Date().toISOString(),
      });

    if (checkInError) {
      return {
        success: false,
        message: "Error al registrar check-in",
      };
    }

    // 5. Actualizar contador de visitas
    await this.supabase
      .from("global_pass_memberships")
      .update({
        visits_this_month: pass.visitsThisMonth + 1,
      })
      .eq("id", pass.id);

    const remaining = pricing.maxVisitsPerMonth - (pass.visitsThisMonth + 1);

    return {
      success: true,
      message: "Check-in exitoso",
      visitsRemaining: remaining > 0 ? remaining : undefined,
    };
  }

  /**
   * Calcular distancia entre dos puntos (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Obtener historial de visitas del usuario
   */
  async getVisitHistory(userId: string, limit = 20): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("global_pass_visits")
      .select(
        `
        *,
        gym:gym_id (
          id,
          name,
          city,
          country
        )
      `
      )
      .eq("user_id", userId)
      .order("checked_in_at", { ascending: false })
      .limit(limit);

    return data || [];
  }
}

// ============================================
// SCHEMA SQL (para Supabase)
// ============================================

export const GLOBAL_PASS_SCHEMA = `
-- Tabla de membresías Global Pass
CREATE TABLE IF NOT EXISTS global_pass_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'premium', 'elite')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
  visits_this_month INT DEFAULT 0,
  home_gym_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de visitas con Global Pass
CREATE TABLE IF NOT EXISTS global_pass_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID REFERENCES global_pass_memberships(id) ON DELETE CASCADE,
  gym_id UUID REFERENCES organizations(id),
  class_id UUID REFERENCES classes(id),
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  checked_out_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_pass_user ON global_pass_memberships(user_id);
CREATE INDEX idx_pass_status ON global_pass_memberships(status);
CREATE INDEX idx_visits_membership ON global_pass_visits(membership_id);
CREATE INDEX idx_visits_gym ON global_pass_visits(gym_id);

-- Agregar columnas a organizations para Global Pass
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS global_pass_enabled BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS global_pass_tiers TEXT[] DEFAULT ARRAY['basic', 'premium', 'elite']::TEXT[];

-- RLS Policies
ALTER TABLE global_pass_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_pass_visits ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver sus propias membresías
CREATE POLICY "Users can view own memberships" ON global_pass_memberships
  FOR SELECT USING (auth.uid() = user_id);

-- Usuarios pueden ver su historial de visitas
CREATE POLICY "Users can view own visits" ON global_pass_visits
  FOR SELECT USING (
    membership_id IN (
      SELECT id FROM global_pass_memberships WHERE user_id = auth.uid()
    )
  );

-- Solo admins pueden crear/modificar membresías
CREATE POLICY "Only admins can manage memberships" ON global_pass_memberships
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );
`;

export default GlobalPassService;
