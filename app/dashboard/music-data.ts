export interface MusicTrack {
    id: string;
    title: string;
    artist: string;
    url: string;
    genre: string;
}

export const RIVAL_MUSIC_LIBRARY: MusicTrack[] = [
    // --- DJ & HOUSE SETS ---
    {
        id: 'tech-house-vibes',
        title: 'Tech House Party',
        artist: 'DJ Rival',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        genre: 'Tech House'
    },
    {
        id: 'ibiza-sunset',
        title: 'Ibiza Sunset Mix',
        artist: 'Deep House Collective',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        genre: 'Deep House'
    },
    {
        id: 'berlin-techno',
        title: 'Berlin Underground',
        artist: 'Techno Master',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        genre: 'Techno'
    },
    {
        id: 'edm-mainstage',
        title: 'Mainstage Hype',
        artist: 'Festival King',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        genre: 'EDM'
    },
    {
        id: 'melodic-techno',
        title: 'Melodic Journey',
        artist: 'Etheral DJ',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
        genre: 'Melodic Techno'
    },

    // --- LATIN & SALSA ---
    {
        id: 'salsa-brava',
        title: 'Salsa Brava Instrumental',
        artist: 'Orquesta Rival',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
        genre: 'Salsa'
    },
    {
        id: 'bachata-flow',
        title: 'Bachata Moderna',
        artist: 'Latino Beats',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
        genre: 'Bachata'
    },
    {
        id: 'merengue-power',
        title: 'Merengue Explosivo',
        artist: 'Tropical Energy',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
        genre: 'Merengue'
    },
    {
        id: 'reggaeton-beat-1',
        title: 'Street Reggaeton',
        artist: 'Urbano Instrumental',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
        genre: 'Reggaeton'
    },

    // --- PHONK & GYM CORE ---
    {
        id: 'brazilian-drift',
        title: 'Brazilian Phonk Core',
        artist: 'Ghost Phonk',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
        genre: 'Phonk'
    },
    {
        id: 'sigma-grind',
        title: 'Sigma Alpha Phonk',
        artist: 'Dark Beats',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
        genre: 'Phonk'
    },
    {
        id: 'aggressive-gym',
        title: 'Aggressive Power',
        artist: 'Training Audio',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
        genre: 'Hardstyle'
    },

    // --- INSTRUMENTAL VARIETY ---
    {
        id: 'lofi-workout',
        title: 'Chill Lofi Gym',
        artist: 'Deep Focus',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
        genre: 'Lofi'
    },
    {
        id: 'classic-rock-instr',
        title: 'Rock Anthem Instr',
        artist: 'Iron Riffs',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3',
        genre: 'Rock'
    },
    {
        id: 'cinematic-victory',
        title: 'Victory Spirit',
        artist: 'Epic Cinematic',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
        genre: 'Cinematic'
    },
    {
        id: 'jazz-lifting',
        title: 'Smooth Lifting',
        artist: 'Jazz Hop',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
        genre: 'Jazz'
    },

    // --- MORE DJ & ELECTRONIC ---
    {
        id: 'drum-and-bass-fast',
        title: 'D&B Cardio',
        artist: 'Velocity DJ',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        genre: 'Drum & Bass'
    },
    {
        id: 'trap-mexican',
        title: 'Trap Mexicano',
        artist: 'Barrio Beast',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        genre: 'Trap'
    },
    {
        id: 'nu-disco-gym',
        title: 'Retro Fitness',
        artist: 'Groove Master',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        genre: 'Disco'
    },
    {
        id: 'prog-house',
        title: 'Progressive Flow',
        artist: 'Cloud DJ',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        genre: 'Progressive House'
    },
    {
        id: 'drill-uk',
        title: 'UK Drill Instrumental',
        artist: 'London Beats',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
        genre: 'Drill'
    },
    {
        id: 'synthwave-night',
        title: 'Night Runner',
        artist: 'Neon Driver',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
        genre: 'Synthwave'
    },
    {
        id: 'hardcore-power',
        title: 'Hardcore Session',
        artist: 'Rival Raw',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
        genre: 'Hardcore'
    },
    {
        id: 'afrobeat-instr',
        title: 'Afrobeat Energy',
        artist: 'Desert Pulse',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
        genre: 'Afrobeat'
    },
    {
        id: 'cumbia-modern',
        title: 'Cumbia Digital',
        artist: 'Latino Electrónico',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
        genre: 'Cumbia'
    },
    {
        id: 'phonk-brazil-epic',
        title: 'Rio Carnage Phonk',
        artist: 'Sigma Brazil',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
        genre: 'Phonk'
    },
    {
        id: 'phonk-slowed',
        title: 'Drift Slowed & Reverb',
        artist: 'Lonely Ghost',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
        genre: 'Phonk'
    },
    {
        id: 'dubstep-beast',
        title: 'Bass Monster',
        artist: 'Wobble King',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
        genre: 'Dubstep'
    },
    {
        id: 'flamenco-chill',
        title: 'Flamenco Sunset',
        artist: 'Spanish Soul',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
        genre: 'Flamenco'
    },
    {
        id: 'phonk-vocal-dist',
        title: 'Aggressive Vocal Phonk',
        artist: 'Night Fury',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3',
        genre: 'Phonk'
    },
    {
        id: 'reggaeton-classic-instr',
        title: 'Old School Beat',
        artist: 'The Real Flow',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
        genre: 'Reggaeton'
    },
    {
        id: 'techno-acid',
        title: 'Acid Warehouse',
        artist: 'Dark Berlin',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
        genre: 'Techno'
    },
    {
        id: 'house-vocal-chill',
        title: 'Summer House',
        artist: 'Coastal Beats',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        genre: 'House'
    },
    {
        id: 'trap-dark-energy',
        title: 'Shadow Boxing',
        artist: 'Arena Trap',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        genre: 'Trap'
    },
    {
        id: 'workout-pop-instr',
        title: 'Energetic Gym Pop',
        artist: 'Chart Beats',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        genre: 'Pop'
    },
    {
        id: 'latin-jazz-workout',
        title: 'Havana Lifts',
        artist: 'Cuban All Stars',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        genre: 'Latin Jazz'
    },
    {
        id: 'phonk-cowbell-hell',
        title: 'Cowbell Chaos',
        artist: 'Sigma Audio',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
        genre: 'Phonk'
    },
    {
        id: 'house-classic-90s',
        title: '90s Gym House',
        artist: 'Old School DJ',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
        genre: 'House'
    },
    {
        id: 'reggaeton-romantic-instr',
        title: 'Slow Flow',
        artist: 'Love Beats',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
        genre: 'Reggaeton'
    },
    {
        id: 'electronic-rock-hybrid',
        title: 'Power Hybrid',
        artist: 'Fusion Rival',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
        genre: 'Electronic'
    },
    {
        id: 'tropical-house-run',
        title: 'Island Runner',
        artist: 'Breezy Beats',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
        genre: 'House'
    },
    {
        id: 'gym-rap-instr',
        title: 'Heavy Bars Beat',
        artist: 'Underground King',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
        genre: 'Hip Hop'
    },
    {
        id: 'salsa-morning-2',
        title: 'Despertar Tropical',
        artist: 'Latino Power',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
        genre: 'Salsa'
    },
    {
        id: 'hardstyle-melodic-2',
        title: 'Sky High Lifts',
        artist: 'Euphoric DJ',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
        genre: 'Hardstyle'
    },
    {
        id: 'phonk-brazil-funk',
        title: 'Rio Funk Core',
        artist: 'Favelas Beat',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
        genre: 'Phonk'
    },
    {
        id: 'deep-house-chill-2',
        title: 'Late Night Cardio',
        artist: 'Midnight Pulse',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3',
        genre: 'Deep House'
    },
    {
        id: 'tech-house-groove-2',
        title: 'The Underground',
        artist: 'Warehouse DJ',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
        genre: 'Tech House'
    },
    {
        id: 'trap-heavy-bass-2',
        title: 'The Ripper',
        artist: 'Doom Beats',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
        genre: 'Trap'
    },
    {
        id: 'rock-modern-gym',
        title: 'New Age Iron',
        artist: 'Modern Riffs',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        genre: 'Rock'
    },
    {
        id: 'trance-classic-gym',
        title: 'Trance Lift',
        artist: 'Legacy DJ',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        genre: 'Trance'
    }
];
