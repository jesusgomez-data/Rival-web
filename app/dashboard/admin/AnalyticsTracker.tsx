'use client'

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { logVisit } from './actions';

export default function AnalyticsTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (pathname) {
            logVisit(pathname, navigator.userAgent).catch(err => {
                // Silently fail if analytics logging fails
                console.warn('[Analytics] Failed to log visit:', err);
            });
        }
    }, [pathname]);

    return null;
}
