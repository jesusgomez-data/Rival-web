import { NextRequest, NextResponse } from 'next/server';

// Jamendo free API — register at https://devportal.jamendo.com to get your own client_id
// The default client_id below is the public Jamendo sandbox key for testing
const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID || 'b6747d04';

const CATEGORIES = [
    { id: 'workout', label: 'Workout', tags: 'energetic+sport+workout' },
    { id: 'electronic', label: 'Electrónica', tags: 'electronic+dance+energetic' },
    { id: 'hiphop', label: 'Hip-Hop', tags: 'hiphop+rap+urban' },
    { id: 'rock', label: 'Rock', tags: 'rock+metal+powerful' },
    { id: 'chill', label: 'Chill', tags: 'chill+lofi+ambient' },
    { id: 'latin', label: 'Latin', tags: 'latin+reggaeton+tropical' },
];

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build Jamendo API URL
    const params = new URLSearchParams({
        client_id: JAMENDO_CLIENT_ID,
        format: 'json',
        limit: String(Math.min(limit, 50)),
        offset: String(offset),
        include: 'musicinfo',
        audioformat: 'mp32',
        boost: 'popularity_week',
        // Always filter to CC licensed music only
        ccsa: '1',       // Commercial use allowed (CC-BY / CC-BY-SA)
        ccnd: '0',       // Allow derivatives
        ccnc: '1',       // Allow commercial use
    });

    if (query) {
        params.set('namesearch', query);
    } else if (category) {
        // Map category to tags
        const cat = CATEGORIES.find(c => c.id === category);
        if (cat) params.set('tags', cat.tags);
    } else {
        // Default: popular workout tracks
        params.set('tags', 'energetic+sport');
    }

    const url = `https://api.jamendo.com/v3.0/tracks/?${params.toString()}`;

    try {
        const res = await fetch(url, {
            next: { revalidate: 600 } // Cache 10 min
        });

        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch from Jamendo' }, { status: 502 });
        }

        const data = await res.json();

        const tracks = (data.results || []).map((t: any) => ({
            id: t.id,
            title: t.name,
            artist: t.artist_name,
            album: t.album_name,
            duration: t.duration,
            url: t.audio,
            previewUrl: t.audiodownload || t.audio,
            cover: t.album_image || t.image,
            license: t.license_ccurl || '',
            tags: t.musicinfo?.tags?.genres || [],
        }));

        return NextResponse.json({
            tracks,
            total: data.headers?.results_count || tracks.length,
            categories: CATEGORIES,
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
            }
        });

    } catch (err) {
        console.error('Music API error:', err);
        return NextResponse.json({ error: 'Music service unavailable', tracks: [] }, { status: 200 });
    }
}
