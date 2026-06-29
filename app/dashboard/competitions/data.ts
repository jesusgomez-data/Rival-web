export interface Competition {
    id: string;
    name: string;
    organizer: string;
    type: 'HYROX' | 'CROSSFIT' | 'OCR' | 'RUNNING' | 'TRIATHLON' | 'HYBRID' | 'OTHER';
    date: string;
    location: string;
    image_url: string;
    registration_url?: string;
    description?: string;
    distance_km?: number; // Optional distance from user
    is_featured?: boolean;
}

export const COMPETITIONS_DATA: Competition[] = [];
