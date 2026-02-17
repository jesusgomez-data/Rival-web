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

export const COMPETITIONS_DATA: Competition[] = [
    {
        id: '1',
        name: 'HYROX MÁLAGA',
        organizer: 'HYROX ESPAÑA',
        type: 'HYROX',
        date: '2026-04-15',
        location: 'Málaga, España',
        image_url: 'https://images.unsplash.com/photo-1517931524326-bdd55a541177?q=80&w=2070&auto=format&fit=crop',
        registration_url: 'https://hyrox.com',
        description: 'La competición de fitness para todos. 8km de carrera y 8 workouts funcionales.',
        is_featured: true
    },
    {
        id: '2',
        name: 'SPARTAN RACE MADRID',
        organizer: 'SPARTAN',
        type: 'OCR',
        date: '2026-05-10',
        location: 'Madrid, España',
        image_url: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=2070&auto=format&fit=crop',
        registration_url: 'https://spartan.com',
        description: 'Supera tus límites en la carrera de obstáculos más famosa del mundo.',
        is_featured: true
    },
    {
        id: '3',
        name: 'IRONMAN 70.3 VALENCIA',
        organizer: 'IRONMAN',
        type: 'TRIATHLON',
        date: '2026-06-22',
        location: 'Valencia, España',
        image_url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=2070&auto=format&fit=crop',
        registration_url: 'https://ironman.com',
        description: 'Nadando en el Mediterráneo, pedaleando por la sierra y corriendo por la Ciudad de las Artes.',
    },
    {
        id: '4',
        name: 'CROSSFIT OPEN 26.1',
        organizer: 'CROSSFIT INC.',
        type: 'CROSSFIT',
        date: '2026-02-28',
        location: 'Global (Online)',
        image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop',
        registration_url: 'https://games.crossfit.com',
        description: 'El inicio de la temporada de los CrossFit Games. Participa desde tu box.',
    },
    {
        id: '5',
        name: 'MARATÓN DE SEVILLA',
        organizer: 'AYTO. SEVILLA',
        type: 'RUNNING',
        date: '2026-02-20',
        location: 'Sevilla, España',
        image_url: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?q=80&w=2074&auto=format&fit=crop',
        registration_url: 'https://zurichmaratonsevilla.es',
        description: 'El maratón más plano de Europa, ideal para conseguir tu mejor marca personal.',
    }
];
