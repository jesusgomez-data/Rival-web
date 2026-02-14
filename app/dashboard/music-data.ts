export interface MusicTrack {
    id: string;
    title: string;
    artist: string;
    url: string;
    genre: string;
}

export const RIVAL_MUSIC_LIBRARY: MusicTrack[] = [
    // --- HIGH ENERGY & EDM ---
    {
        id: 'energy-workout',
        title: 'Energy Workout',
        artist: 'Bensound',
        url: 'https://www.bensound.com/bensound-music/bensound-energy.mp3',
        genre: 'Electronic'
    },
    {
        id: 'the-complex',
        title: 'The Complex',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/The%20Complex.mp3',
        genre: 'Tech House'
    },
    {
        id: 'volatile-reaction',
        title: 'Volatile Reaction',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Volatile%20Reaction.mp3',
        genre: 'Techno'
    },
    {
        id: 'dubstep-blast',
        title: 'Dubstep Blast',
        artist: 'Bensound',
        url: 'https://www.bensound.com/bensound-music/bensound-dubstep.mp3',
        genre: 'Dubstep'
    },

    // --- ROCK & METAL (VOCAL) ---
    {
        id: 'iron-riffs',
        title: 'Iron Riffs (Vocal)',
        artist: 'Jamendo Rock',
        url: 'https://mp3l.jamendo.com/?trackid=1214935&format=mp31&from=app',
        genre: 'Rock'
    },
    {
        id: 'hard-rock-power',
        title: 'Hard Rock Power',
        artist: 'Bensound',
        url: 'https://www.bensound.com/bensound-music/bensound-happyrock.mp3',
        genre: 'Rock'
    },

    // --- LATIN & REGGAETON (VOCAL/DANCE) ---
    {
        id: 'baila-conmigo',
        title: 'Baila Conmigo (Reggaeton)',
        artist: 'Latino Beats',
        url: 'https://mp3l.jamendo.com/?trackid=1493210&format=mp31&from=app',
        genre: 'Reggaeton'
    },
    {
        id: 'club-seis',
        title: 'Club Seis',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Club%20Seis.mp3',
        genre: 'Latin'
    },

    // --- POP & CATCHY ---
    {
        id: 'summer-party',
        title: 'Summer Party',
        artist: 'Bensound',
        url: 'https://www.bensound.com/bensound-music/bensound-summer.mp3',
        genre: 'Pop'
    },
    {
        id: 'we-are-legend',
        title: 'We Are Legend',
        artist: 'Jamendo Electronic',
        url: 'https://mp3l.jamendo.com/?trackid=1888434&format=mp31&from=app',
        genre: 'Dance'
    },

    // --- EPIC & MOTIVATIONAL ---
    {
        id: 'epic-victory',
        title: 'Epic Victory',
        artist: 'Bensound',
        url: 'https://www.bensound.com/bensound-music/bensound-epic.mp3',
        genre: 'Cinematic'
    },

    // --- CHILL & LO-FI ---
    {
        id: 'lobby-time',
        title: 'Lobby Time (Cool Down)',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Lobby%20Time.mp3',
        genre: 'Lo-fi'
    },
    {
        id: 'relaxing-vibe',
        title: 'Relaxing Skies',
        artist: 'Jamendo Indie',
        url: 'https://mp3l.jamendo.com/?trackid=1188360&format=mp31&from=app',
        genre: 'Chill'
    }
];
