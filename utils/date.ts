export function getMonday(date: Date = new Date()): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
}

export function formatTimeAgo(dateString: string, language: 'es' | 'en' = 'es'): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return language === 'es' ? 'ahora mismo' : 'just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return language === 'es' ? `hace ${diffInMinutes} min` : `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return language === 'es' ? `hace ${diffInHours}h` : `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return language === 'es' ? `hace ${diffInDays}d` : `${diffInDays}d ago`;
    }

    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
        day: 'numeric',
        month: 'short'
    });
}
