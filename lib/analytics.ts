/**
 * RIVALFIT - Analytics & Event Tracking System
 * Track user behavior para optimizar retención y conversión
 */

import { createClient } from '@/utils/supabase/client';

// ============================================
// EVENT TYPES
// ============================================

export type EventType =
  // Auth Events
  | 'signup_started'
  | 'signup_completed'
  | 'login_success'
  | 'logout'

  // Onboarding Events
  | 'onboarding_step_1'
  | 'onboarding_step_2'
  | 'onboarding_step_3'
  | 'onboarding_step_4'
  | 'onboarding_completed'

  // Center Events
  | 'center_created'
  | 'center_profile_viewed'
  | 'center_profile_edited'
  | 'center_followed'
  | 'center_unfollowed'

  // Class Events
  | 'class_created'
  | 'class_viewed'
  | 'class_booked'
  | 'class_cancelled'
  | 'class_attended'
  | 'class_no_show'

  // Trial/Lead Events
  | 'trial_requested'
  | 'trial_approved'
  | 'trial_rejected'
  | 'lead_to_member_conversion'

  // E-commerce Events
  | 'product_viewed'
  | 'add_to_cart'
  | 'checkout_started'
  | 'checkout_completed'
  | 'purchase'

  // Social Events
  | 'post_created'
  | 'post_liked'
  | 'post_commented'
  | 'message_sent'

  // Engagement Events
  | 'page_view'
  | 'search_performed'
  | 'filter_applied'
  | 'share_clicked'

  // Subscription Events
  | 'plan_viewed'
  | 'plan_selected'
  | 'upgrade_started'
  | 'upgrade_completed'
  | 'downgrade'
  | 'cancellation';

export interface EventMetadata {
  // Common fields
  userId?: string;
  centerId?: string;
  sessionId?: string;

  // Event-specific data
  planType?: string;
  amount?: number;
  currency?: string;
  productId?: string;
  classId?: string;
  source?: string;
  referrer?: string;

  // Technical data
  userAgent?: string;
  screenSize?: string;
  device?: string;
  browser?: string;

  // Custom fields
  [key: string]: any;
}

// ============================================
// ANALYTICS CLASS
// ============================================

class Analytics {
  private supabase = createClient();
  private sessionId: string;
  private isEnabled: boolean;

  constructor() {
    // Generate unique session ID
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if analytics is enabled (respect user privacy)
    this.isEnabled =
      typeof window !== 'undefined' &&
      !window.navigator.doNotTrack &&
      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'false';

    // Auto-track page views
    if (typeof window !== 'undefined' && this.isEnabled) {
      this.trackPageView();
      this.setupAutoTracking();
    }
  }

  // ============================================
  // TRACK EVENT
  // ============================================

  async track(eventType: EventType, metadata: EventMetadata = {}) {
    if (!this.isEnabled) return;

    try {
      // Get current user
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      // Collect device/browser info
      const deviceInfo = this.getDeviceInfo();

      // Prepare event data
      const eventData = {
        event_type: eventType,
        user_id: user?.id || metadata.userId,
        session_id: this.sessionId,
        metadata: {
          ...metadata,
          ...deviceInfo,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          referrer: document.referrer,
        },
      };

      // Save to Supabase
      const { error } = await this.supabase.from('user_events').insert(eventData);

      if (error) {
        console.error('Analytics error:', error);
      }

      // Also send to external analytics (PostHog, Mixpanel, GA4, etc.)
      this.sendToExternalProviders(eventType, eventData.metadata);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  // ============================================
  // TRACK PAGE VIEW
  // ============================================

  trackPageView(metadata: EventMetadata = {}) {
    if (typeof window === 'undefined') return;

    this.track('page_view', {
      ...metadata,
      page_path: window.location.pathname,
      page_title: document.title,
    });
  }

  // ============================================
  // IDENTIFY USER
  // ============================================

  async identify(userId: string, traits: Record<string, any> = {}) {
    if (!this.isEnabled) return;

    try {
      // Update user profile with traits
      await this.supabase.from('profiles').upsert(
        {
          id: userId,
          ...traits,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      // Track identify event
      this.track('login_success', {
        userId,
        ...traits,
      });
    } catch (error) {
      console.error('Failed to identify user:', error);
    }
  }

  // ============================================
  // FUNNEL TRACKING
  // ============================================

  async trackFunnel(funnelName: string, step: string, metadata: EventMetadata = {}) {
    this.track(`${funnelName}_${step}` as EventType, {
      ...metadata,
      funnel_name: funnelName,
      funnel_step: step,
    });
  }

  // ============================================
  // CONVERSION TRACKING
  // ============================================

  async trackConversion(conversionType: string, value: number, currency = 'EUR') {
    this.track('purchase', {
      conversion_type: conversionType,
      amount: value,
      currency,
    });

    // Facebook Pixel
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Purchase', {
        value,
        currency,
      });
    }

    // Google Ads Conversion
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'conversion', {
        send_to: 'AW-XXXXXXXXX/XXXXXXX',
        value,
        currency,
      });
    }
  }

  // ============================================
  // AUTO-TRACKING
  // ============================================

  private setupAutoTracking() {
    if (typeof window === 'undefined') return;

    // Track clicks on CTAs
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Track CTA buttons
      if (target.classList.contains('cta-button') || target.getAttribute('data-track-cta')) {
        this.track('share_clicked', {
          button_text: target.textContent || '',
          button_location: window.location.pathname,
        });
      }

      // Track external links
      if (target.tagName === 'A' && (target as HTMLAnchorElement).hostname !== window.location.hostname) {
        this.track('share_clicked', {
          external_url: (target as HTMLAnchorElement).href,
        });
      }
    });

    // Track form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target as HTMLFormElement;
      const formName = form.getAttribute('name') || form.id || 'unknown';

      this.track('signup_started', {
        form_name: formName,
      });
    });

    // Track time on page (engagement)
    let startTime = Date.now();
    window.addEventListener('beforeunload', () => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      this.track('page_view', {
        time_spent_seconds: timeSpent,
      });
    });

    // Track scroll depth
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.floor(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;

        // Track milestones (25%, 50%, 75%, 100%)
        if ([25, 50, 75, 100].includes(scrollPercent)) {
          this.track('page_view', {
            scroll_depth: scrollPercent,
          });
        }
      }
    });
  }

  // ============================================
  // DEVICE INFO
  // ============================================

  private getDeviceInfo() {
    if (typeof window === 'undefined') return {};

    const ua = navigator.userAgent;

    return {
      userAgent: ua,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      device: /mobile/i.test(ua) ? 'mobile' : /tablet/i.test(ua) ? 'tablet' : 'desktop',
      browser: this.getBrowserName(ua),
      os: this.getOS(ua),
    };
  }

  private getBrowserName(ua: string): string {
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  }

  private getOS(ua: string): string {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Other';
  }

  // ============================================
  // EXTERNAL PROVIDERS
  // ============================================

  private sendToExternalProviders(eventType: string, metadata: any) {
    // Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventType, metadata);
    }

    // PostHog
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture(eventType, metadata);
    }

    // Mixpanel
    if (typeof window !== 'undefined' && (window as any).mixpanel) {
      (window as any).mixpanel.track(eventType, metadata);
    }

    // Facebook Pixel
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('trackCustom', eventType, metadata);
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const analytics = new Analytics();

// ============================================
// REACT HOOK
// ============================================

export function useAnalytics() {
  return {
    track: analytics.track.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    identify: analytics.identify.bind(analytics),
    trackFunnel: analytics.trackFunnel.bind(analytics),
    trackConversion: analytics.trackConversion.bind(analytics),
  };
}

// ============================================
// EJEMPLO DE USO
// ============================================

/*
// En un componente React:
import { useAnalytics } from '@/lib/analytics';

function MyComponent() {
  const analytics = useAnalytics();

  const handleSignup = () => {
    analytics.track('signup_completed', {
      planType: 'starter',
      source: 'landing_page'
    });
  };

  return <button onClick={handleSignup}>Sign Up</button>;
}

// Track conversión:
analytics.trackConversion('center_signup', 49.99, 'EUR');

// Track funnel:
analytics.trackFunnel('onboarding', 'step_1');
*/
