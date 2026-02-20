export interface MusicTrack {
    id: string;
    title: string;
    artist: string;
    url: string;
    genre: string;
}

export const RIVAL_MUSIC_LIBRARY: MusicTrack[] = [
    // --- NEFFEX (STABLE ARCHIVE) ---
    { id: 'neffex-grateful', title: 'Grateful', artist: 'NEFFEX', url: 'https://archive.org/download/neffex-grateful/Grateful.mp3', genre: 'Motivational' },
    { id: 'neffex-soldier', title: 'Soldier', artist: 'NEFFEX', url: 'https://archive.org/download/neffex-soldier/NEFFEX%20-%20Soldier.mp3', genre: 'Epic' },
    { id: 'neffex-fight-back', title: 'Fight Back', artist: 'NEFFEX', url: 'https://archive.org/download/neffex-fight-back/NEFFEX%20-%20Fight%20Back.mp3', genre: 'Aggressive' },
    { id: 'neffex-best-of-me', title: 'Best of Me', artist: 'NEFFEX', url: 'https://archive.org/download/neffex-best-of-me/NEFFEX%20-%20Best%20of%20Me.mp3', genre: 'Motivacion' },

    // --- PHONK & GYM (ARCHIVE DRIVEN) ---
    { id: 'phonk-sahara', title: 'Sahara', artist: 'Hensonn', url: 'https://archive.org/download/sahara-hensonn/Sahara-Hensonn.mp3', genre: 'Phonk' },
    { id: 'phonk-neon-blade', title: 'Neon Blade', artist: 'Moon Deity', url: 'https://archive.org/download/moon-deity-neon-blade/Moon%20Deity%20-%20Neon%20Blade.mp3', genre: 'Phonk' },
    { id: 'phonk-murder-plot', title: 'Murder Plot', artist: 'Kordhell', url: 'https://archive.org/download/kordhell-murder-plot/Kordhell-Murder-Plot.mp3', genre: 'Phonk' },
    { id: 'phonk-odium', title: 'Odium', artist: 'Lxst Cxntury', url: 'https://archive.org/download/lxst-cxntury-odium/Lxst%20Cxntury%20-%20Odium.mp3', genre: 'Phonk' },

    // --- SOUNDHELIX (COLLECTION - 100% WORKING) ---
    { id: 'sh-1', title: 'Rival Rhythm 01', artist: 'SoundHelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', genre: 'Electronic' },
    { id: 'sh-2', title: 'Rival Rhythm 02', artist: 'SoundHelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', genre: 'Trance' },
    { id: 'sh-3', title: 'Rival Rhythm 03', artist: 'SoundHelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', genre: 'Ambient' },
    { id: 'sh-4', title: 'Rival Rhythm 04', artist: 'SoundHelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', genre: 'Chill' },
    { id: 'sh-8', title: 'Rival Rhythm 05', artist: 'SoundHelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', genre: 'Electronic' },
    { id: 'sh-9', title: 'Rival Rhythm 06', artist: 'SoundHelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', genre: 'Electronic' },
    { id: 'sh-10', title: 'Deep Workout', artist: 'SoundHelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', genre: 'Deep' },
    { id: 'sh-13', title: 'Iron Focus', artist: 'SoundHelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', genre: 'Epic' },
    { id: 'sh-15', title: 'Power Surge', artist: 'SoundHelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3', genre: 'Rock' },
    { id: 'sh-16', title: 'Maximum Push', artist: 'SoundHelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3', genre: 'Electronic' }
];

// NOTE: All links migrated to Archive.org and SoundHelix to avoid hotlinking protection and CORS issues.
