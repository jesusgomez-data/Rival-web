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
        name: 'CROSSFIT GAMES 2026',
        organizer: 'CROSSFIT INC.',
        type: 'CROSSFIT',
        date: '2026-07-28',
        location: 'Fort Worth, Texas (USA)',
        image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop',
        registration_url: 'https://games.crossfit.com',
        description: 'El evento más prestigioso del CrossFit mundial. Compete o sigue en vivo a los mejores atletas del planeta.',
        is_featured: true
    },
    {
        id: '5',
        name: 'MARATÓN DE BARCELONA',
        organizer: 'AJUNTAMENT DE BARCELONA',
        type: 'RUNNING',
        date: '2026-03-15',
        location: 'Barcelona, España',
        image_url: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?q=80&w=2074&auto=format&fit=crop',
        registration_url: 'https://maratobarcelona.com',
        description: 'Uno de los maratones más populares de Europa, con un recorrido espectacular por la ciudad condal.',
    },
    {
        id: '6',
        name: 'HYROX BARCELONA',
        organizer: 'HYROX ESPAÑA',
        type: 'HYROX',
        date: '2026-03-21',
        location: 'Barcelona, España',
        image_url: 'https://images.unsplash.com/photo-1517931524326-bdd55a541177?q=80&w=2070&auto=format&fit=crop',
        registration_url: 'https://hyrox.com',
        description: 'El World Series de Fitness llega a Barcelona. 8km de carrera + 8 estaciones funcionales.',
        is_featured: true
    },
    {
        id: '7',
        name: 'TOUGH MUDDER VALENCIA',
        organizer: 'TOUGH MUDDER',
        type: 'OCR',
        date: '2026-04-25',
        location: 'Valencia, España',
        image_url: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=2070&auto=format&fit=crop',
        registration_url: 'https://toughmudder.com',
        description: '20km de barro, agua helada y 25 obstáculos diseñados para llevarte al límite. ¿Te atreves?',
    },
    {
        id: '8',
        name: 'TRIATLÓN DE MADRID',
        organizer: 'FETRI',
        type: 'TRIATHLON',
        date: '2026-05-31',
        location: 'Madrid, España',
        image_url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=2070&auto=format&fit=crop',
        registration_url: 'https://fetri.org',
        description: 'Natación, ciclismo y running por las calles de Madrid. Distancia olímpica y sprint disponibles.',
    },
    {
        id: '9',
        name: 'BOX TO BOX CHAMPIONSHIP',
        organizer: 'RIVALFIT',
        type: 'CROSSFIT',
        date: '2026-09-12',
        location: 'Madrid, España',
        image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop',
        registration_url: 'https://rivalfit.com',
        description: 'El primer campeonato interboxes organizado por RivalFit. Compite con tu equipo y demuestra quién domina la arena.',
        is_featured: true
    },
];
