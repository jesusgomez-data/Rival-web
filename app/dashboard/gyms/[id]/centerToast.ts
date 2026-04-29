// Lightweight toast helper for center management pages
// Replaces alert() calls — dispatches to the CenterToast listener in GymLayoutClient

export function centerToast(message: string, type: 'success' | 'error' | 'info' = 'error') {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('center-toast', { detail: { message, type } }));
    }
}
