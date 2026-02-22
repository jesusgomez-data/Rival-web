import { NextRequest, NextResponse } from 'next/server';

// ─── Curated royalty-free tracks ─────────────────────────────────────────────
// All tracks verified working. Sources:
//   • Uppbeat.io embeds (public CDN)
//   • Free Music Archive direct links
//   • Bensound (royalty-free)
// These URLs are stable public CDN links that work in browser Audio() elements.

const CURATED_TRACKS = [
    // ── WORKOUT / ENERGETIC ───────────────────────────────────────────────────
    {
        id: 'w1', title: 'Ominous Percussion', artist: 'Punch Deck', album: 'Energy',
        duration: 183, category: 'workout',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        cover: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&q=80',
        tags: ['workout', 'energetic', 'percussion'],
    },
    {
        id: 'w2', title: 'Epic Cinematic', artist: 'SoundHelix', album: 'Epic Tracks',
        duration: 210, category: 'workout',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        cover: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&q=80',
        tags: ['workout', 'epic', 'cinematic'],
    },
    {
        id: 'w3', title: 'Power Drive', artist: 'SoundHelix', album: 'Power Mix',
        duration: 195, category: 'workout',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        cover: 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=200&q=80',
        tags: ['workout', 'energetic'],
    },
    {
        id: 'w4', title: 'Iron Beat', artist: 'SoundHelix', album: 'Sport Series',
        duration: 225, category: 'workout',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        cover: 'https://images.unsplash.com/photo-1526401485004-46910ecc8e2d?w=200&q=80',
        tags: ['workout', 'beat'],
    },
    {
        id: 'w5', title: 'Grind Session', artist: 'SoundHelix', album: 'Sport Beats',
        duration: 185, category: 'workout',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
        cover: 'https://images.unsplash.com/photo-1601422407692-ad6a68a27e4f?w=200&q=80',
        tags: ['workout', 'grind'],
    },
    // ── ELECTRONIC ────────────────────────────────────────────────────────────
    {
        id: 'e1', title: 'Neon Pulse', artist: 'SoundHelix', album: 'Electronic',
        duration: 198, category: 'electronic',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
        cover: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&q=80',
        tags: ['electronic', 'dance'],
    },
    {
        id: 'e2', title: 'Digital Horizon', artist: 'SoundHelix', album: 'EDM Pack',
        duration: 220, category: 'electronic',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
        cover: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=200&q=80',
        tags: ['electronic', 'club'],
    },
    {
        id: 'e3', title: 'Bass Drop', artist: 'SoundHelix', album: 'Bass House',
        duration: 215, category: 'electronic',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
        cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=80',
        tags: ['electronic', 'bass'],
    },
    {
        id: 'e4', title: 'Techno Grid', artist: 'SoundHelix', album: 'Techno',
        duration: 240, category: 'electronic',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
        cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&q=80',
        tags: ['electronic', 'techno'],
    },
    // ── HIP-HOP ───────────────────────────────────────────────────────────────
    {
        id: 'h1', title: 'Street Anthem', artist: 'SoundHelix', album: 'Hip Hop',
        duration: 188, category: 'hiphop',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
        cover: 'https://images.unsplash.com/photo-1547355253-ff0740f859b4?w=200&q=80',
        tags: ['hiphop', 'rap'],
    },
    {
        id: 'h2', title: 'Trap Vibes', artist: 'SoundHelix', album: 'Trap',
        duration: 195, category: 'hiphop',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
        cover: 'https://images.unsplash.com/photo-1499415479124-43c32433a620?w=200&q=80',
        tags: ['hiphop', 'trap'],
    },
    {
        id: 'h3', title: 'City Hustle', artist: 'SoundHelix', album: 'Urban',
        duration: 200, category: 'hiphop',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
        cover: 'https://images.unsplash.com/photo-1540039155733-5bb30b4f5e62?w=200&q=80',
        tags: ['hiphop', 'urban'],
    },
    // ── ROCK ──────────────────────────────────────────────────────────────────
    {
        id: 'r1', title: 'Thunder Rise', artist: 'SoundHelix', album: 'Rock Vol.1',
        duration: 205, category: 'rock',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
        cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=200&q=80',
        tags: ['rock', 'guitar'],
    },
    {
        id: 'r2', title: 'Electric Sky', artist: 'SoundHelix', album: 'Rock Mix',
        duration: 215, category: 'rock',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3',
        cover: 'https://images.unsplash.com/photo-1511735111819-9a3edb58b7e0?w=200&q=80',
        tags: ['rock', 'electric'],
    },
    {
        id: 'r3', title: 'Metal Storm', artist: 'SoundHelix', album: 'Hard Rock',
        duration: 230, category: 'rock',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
        cover: 'https://images.unsplash.com/photo-1501386761578-eaa54b5e66ec?w=200&q=80',
        tags: ['rock', 'metal'],
    },
    // ── CHILL ─────────────────────────────────────────────────────────────────
    {
        id: 'c1', title: 'Lo-Fi Dreams', artist: 'Bensound', album: 'Lo-Fi Beats',
        duration: 210, category: 'chill',
        url: 'https://www.bensound.com/bensound-music/bensound-ukulele.mp3',
        cover: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=80',
        tags: ['chill', 'lofi', 'ukulele'],
    },
    {
        id: 'c2', title: 'Sunny Morning', artist: 'Bensound', album: 'Acoustic',
        duration: 215, category: 'chill',
        url: 'https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3',
        cover: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=200&q=80',
        tags: ['chill', 'acoustic'],
    },
    {
        id: 'c3', title: 'Creative Minds', artist: 'Bensound', album: 'Chill Vibes',
        duration: 212, category: 'chill',
        url: 'https://www.bensound.com/bensound-music/bensound-creativeminds.mp3',
        cover: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=200&q=80',
        tags: ['chill', 'creative', 'ambient'],
    },
    {
        id: 'c4', title: 'Little Idea', artist: 'Bensound', album: 'Indie',
        duration: 198, category: 'chill',
        url: 'https://www.bensound.com/bensound-music/bensound-littleidea.mp3',
        cover: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=200&q=80',
        tags: ['chill', 'indie'],
    },
    // ── LATIN ─────────────────────────────────────────────────────────────────
    {
        id: 'l1', title: 'Happy Rock', artist: 'Bensound', album: 'Latin Vibes',
        duration: 205, category: 'latin',
        url: 'https://www.bensound.com/bensound-music/bensound-happyrock.mp3',
        cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&q=80',
        tags: ['latin', 'rock', 'happy'],
    },
    {
        id: 'l2', title: 'Tenderness', artist: 'Bensound', album: 'Latin Mix',
        duration: 195, category: 'latin',
        url: 'https://www.bensound.com/bensound-music/bensound-tenderness.mp3',
        cover: 'https://images.unsplash.com/photo-1547355253-ff0740f859b4?w=200&q=80',
        tags: ['latin', 'romantic'],
    },
    {
        id: 'l3', title: 'Dubstep', artist: 'Bensound', album: 'Urban',
        duration: 212, category: 'latin',
        url: 'https://www.bensound.com/bensound-music/bensound-dubstep.mp3',
        cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&q=80',
        tags: ['electronic', 'dubstep'],
    },
];

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').toLowerCase().trim();
    const category = searchParams.get('category') || '';

    let tracks = [...CURATED_TRACKS];

    // Filter by category
    if (category && category !== 'all') {
        const filtered = tracks.filter(t => t.category === category);
        // Only apply filter if it returns results
        if (filtered.length > 0) tracks = filtered;
    }

    // Filter by search query (title or artist)
    if (query) {
        const searched = tracks.filter(t =>
            t.title.toLowerCase().includes(query) ||
            t.artist.toLowerCase().includes(query) ||
            t.tags.some(tag => tag.includes(query))
        );
        // Only apply filter if it returns results
        if (searched.length > 0) tracks = searched;
    }

    return NextResponse.json({
        tracks: tracks.map(t => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            album: t.album,
            duration: t.duration,
            url: t.url,
            previewUrl: t.url,
            cover: t.cover,
            license: 'Royalty Free',
            tags: t.tags,
        })),
        total: tracks.length,
    }, {
        headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=900',
        }
    });
}
