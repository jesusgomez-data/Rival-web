export interface MusicTrack {
    id: string;
    title: string;
    artist: string;
    url: string;
    genre: string;
}

export const RIVAL_MUSIC_LIBRARY: MusicTrack[] = [
    {
        id: 'aggressive-phonk',
        title: 'Aggressive Phonk',
        artist: 'Rival Beats',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        genre: 'Phonk'
    },
    {
        id: 'cyber-workout',
        title: 'Cyber Workout',
        artist: 'Future Sport',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        genre: 'Electronic'
    },
    {
        id: 'metal-energy',
        title: 'Metal Energy',
        artist: 'Heavy Gains',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        genre: 'Rock'
    },
    {
        id: 'epic-motivation',
        title: 'Epic Motivation',
        artist: 'Cinematic Athlos',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        genre: 'Cinematic'
    },
    {
        id: 'trap-beast',
        title: 'Trap Beast',
        artist: 'Arena Trap',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
        genre: 'Trap'
    },
    {
        id: 'phonk-drift',
        title: 'Night Drift Phonk',
        artist: 'Ghost Beats',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
        genre: 'Phonk'
    }
];
