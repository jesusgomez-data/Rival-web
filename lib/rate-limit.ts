/**
 * RIVALFIT - Rate Limiting System
 * Protege APIs de abuso y ataques DDoS
 *
 * MODO DESARROLLO: Usa memoria local (Map)
 * MODO PRODUCCIÓN: Usa Upstash Redis (configurar UPSTASH_REDIS_REST_URL)
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ============================================
// CONFIGURACIÓN POR ENDPOINT
// ============================================

export const RATE_LIMITS = {
  // Signup: Muy restrictivo (prevenir spam de cuentas)
  'center-signup': {
    requests: 3,        // 3 intentos
    window: '1 h',      // por hora
  },

  // API de creación de centros
  'api-centers-post': {
    requests: 5,
    window: '10 m',
  },

  // API de consulta de centros
  'api-centers-get': {
    requests: 100,
    window: '1 m',
  },

  // Clases (crear/modificar)
  'api-classes': {
    requests: 30,
    window: '1 m',
  },

  // Trial requests (solicitudes de prueba)
  'api-trial-requests': {
    requests: 10,
    window: '1 h',
  },

  // Productos/tienda
  'api-products': {
    requests: 50,
    window: '1 m',
  },

  // Checkout/pagos
  'api-checkout': {
    requests: 5,
    window: '5 m',
  },
} as const;

// ============================================
// RATE LIMITER (In-Memory Fallback)
// ============================================

class InMemoryRateLimiter {
  private cache: Map<string, { count: number; resetAt: number }> = new Map();

  async limit(identifier: string, maxRequests: number, windowMs: number) {
    const now = Date.now();
    const key = identifier;
    const cached = this.cache.get(key);

    // Limpiar cache expirado (garbage collection)
    if (this.cache.size > 10000) {
      for (const [k, v] of this.cache.entries()) {
        if (v.resetAt < now) {
          this.cache.delete(k);
        }
      }
    }

    // Si no existe o expiró, crear nueva ventana
    if (!cached || cached.resetAt < now) {
      this.cache.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: now + windowMs,
      };
    }

    // Si excede el límite
    if (cached.count >= maxRequests) {
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: cached.resetAt,
      };
    }

    // Incrementar contador
    cached.count += 1;
    this.cache.set(key, cached);

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - cached.count,
      reset: cached.resetAt,
    };
  }
}

const inMemoryLimiter = new InMemoryRateLimiter();

// ============================================
// RATE LIMITER FACTORY
// ============================================

function createRateLimiter(endpointKey: keyof typeof RATE_LIMITS) {
  const config = RATE_LIMITS[endpointKey];

  // Parse window string (e.g., "1 h" -> milliseconds)
  const parseWindow = (window: string): number => {
    const match = window.match(/(\d+)\s*([smh])/);
    if (!match) return 60000; // default 1 min

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      default: return 60000;
    }
  };

  const windowMs = parseWindow(config.window);

  // Si existe UPSTASH_REDIS_REST_URL, usar Upstash
  if (process.env.UPSTASH_REDIS_REST_URL) {
    return new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
      analytics: true,
      prefix: `ratelimit:${endpointKey}`,
    });
  }

  // Fallback: In-memory rate limiter
  return {
    limit: async (identifier: string) => {
      return inMemoryLimiter.limit(identifier, config.requests, windowMs);
    },
  };
}

// ============================================
// EXPORTS
// ============================================

export const rateLimiters = {
  centerSignup: createRateLimiter('center-signup'),
  centersPost: createRateLimiter('api-centers-post'),
  centersGet: createRateLimiter('api-centers-get'),
  classes: createRateLimiter('api-classes'),
  trialRequests: createRateLimiter('api-trial-requests'),
  products: createRateLimiter('api-products'),
  checkout: createRateLimiter('api-checkout'),
};

// ============================================
// HELPER: Get IP Address
// ============================================

export function getClientIdentifier(request: Request): string {
  // 1. Cloudflare - most trusted (set by CF infra, not spoofable)
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // 2. Vercel - set by Vercel infra
  const vercelIp = request.headers.get('x-real-ip');
  if (vercelIp) {
    return vercelIp;
  }

  // 3. X-Forwarded-For: take the LAST IP (closest trusted proxy),
  //    not the first (which can be spoofed by clients)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim());
    return ips[ips.length - 1];
  }

  // 4. Fallback
  return 'unknown';
}

// ============================================
// HELPER: Rate Limit Response Headers
// ============================================

export function setRateLimitHeaders(
  headers: Headers,
  result: {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }
) {
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString());

  if (!result.success) {
    headers.set('Retry-After', Math.ceil((result.reset - Date.now()) / 1000).toString());
  }

  return headers;
}
