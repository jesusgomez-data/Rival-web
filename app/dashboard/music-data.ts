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
    },
    {
        id: 'that-zen-moment',
        title: 'That Zen Moment',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/That%20Zen%20Moment.mp3',
        genre: 'Ambient'
    },
    {
        id: 'morning-harps',
        title: 'Morning',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Morning.mp3',
        genre: 'Classical'
    },
    {
        id: 'equatorial-complex',
        title: 'Equatorial Complex',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Equatorial%20Complex.mp3',
        genre: 'Synthwave'
    },

    // --- FUNK & GROOVE ---
    {
        id: 'i-got-a-stick',
        title: 'I Got a Stick',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/I%20Got%20a%20Stick%20Arr%20Bryan%20Teoh.mp3',
        genre: 'Funk'
    },
    {
        id: 'sergios-magic-dustbin',
        title: "Sergio's Magic Dustbin",
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Sergio%27s%20Magic%20Dustbin.mp3',
        genre: 'Quirky'
    },
    {
        id: 'boogie-party',
        title: 'Boogie Party',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Boogie%20Party.mp3',
        genre: 'Blues Rock'
    },

    // --- WORLD & FOLK ---
    {
        id: 'paradise-found',
        title: 'Paradise Found',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Paradise_Found.mp3',
        genre: 'Tropical'
    },
    {
        id: 'lord-of-the-rangs',
        title: 'Lord of the Rangs',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Lord%20of%20the%20Rangs.mp3',
        genre: 'World'
    },
    {
        id: 'southern-gothic',
        title: 'Southern Gothic',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Southern%20Gothic.mp3',
        genre: 'Folk'
    },

    // --- CINEMATIC & ATMOSPHERE ---
    {
        id: 'dentaneosuchus-hunt',
        title: 'Dentaneosuchus Hunt',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Dentaneosuchus%20Hunt.mp3',
        genre: 'Action'
    },
    {
        id: 'adventures-adventureland',
        title: 'Adventureland',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Adventures%20in%20Adventureland.mp3',
        genre: 'Orchestral'
    },
    {
        id: 'brain-dance',
        title: 'Brain Dance',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Brain%20Dance.mp3',
        genre: 'Cyberpunk'
    },

    // --- JAZZ & SMOOTH ---
    {
        id: 'space-jazz',
        title: 'Space Jazz',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Space%20Jazz.mp3',
        genre: 'Jazz'
    },
    {
        id: 'night-in-venice',
        title: 'Night in Venice',
        artist: 'Kevin MacLeod',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Night%20in%20Venice.mp3',
        genre: 'Smooth Jazz'
    }
];
