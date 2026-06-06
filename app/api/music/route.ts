import { NextRequest, NextResponse } from 'next/server';

// ─── iTunes Search API Proxy ─────────────────────────────────────────────────
// Proxies search requests to Apple's iTunes Search API to avoid CORS issues.
// The iTunes Search API is free, requires no API key, and returns 30-second
// preview URLs that are stable and don't expire.

const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';

// Pre-defined search terms for "popular/trending" when no query is provided.
// Each call picks a random subset to keep the results fresh.
const TRENDING_QUERIES = [
    'bad bunny',
    'travis scott',
    'the weeknd',
    'dua lipa',
    'drake',
    'karol g',
    'eminem workout',
    'feid',
    'billie eilish',
    'kendrick lamar',
    'daddy yankee',
    'shakira',
    'peso pluma',
    'linkin park',
    'ac dc',
    'imagine dragons',
    'quevedo',
    'myke towers',
    'arctic monkeys',
    'duki',
];

// Category → iTunes search terms mapping
const CATEGORY_TERMS: Record<string, string> = {
    workout: 'workout motivation gym',
    electronic: 'electronic dance EDM',
    hiphop: 'hip hop rap',
    rock: 'rock energy',
    chill: 'lo-fi chill beats',
    latin: 'reggaeton latin',
    pop: 'pop hits',
};

interface ITunesResult {
    trackId: number;
    trackName: string;
    artistName: string;
    collectionName?: string;
    previewUrl?: string;
    artworkUrl100?: string;
    trackTimeMillis?: number;
    primaryGenreName?: string;
}

interface MappedTrack {
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    url: string;
    previewUrl: string;
    cover: string;
    genre: string;
}

function mapITunesTrack(item: ITunesResult): MappedTrack | null {
    // Skip results without a preview URL
    if (!item.previewUrl) return null;

    // Upgrade artwork to 400px for crisp covers
    const cover = item.artworkUrl100
        ? item.artworkUrl100.replace('100x100', '400x400')
        : '';

    return {
        id: `itunes-${item.trackId}`,
        title: item.trackName,
        artist: item.artistName,
        album: item.collectionName || '',
        duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30,
        url: item.previewUrl,
        previewUrl: item.previewUrl,
        cover,
        genre: item.primaryGenreName || '',
    };
}

async function searchItunes(term: string, limit = 25): Promise<MappedTrack[]> {
    try {
        const params = new URLSearchParams({
            term,
            media: 'music',
            entity: 'song',
            limit: String(limit),
        });

        const res = await fetch(`${ITUNES_SEARCH_URL}?${params}`, {
            next: { revalidate: 3600 }, // Cache for 1 hour on server
        });

        if (!res.ok) {
            console.error('[Music API] iTunes fetch failed:', res.status);
            return [];
        }

        const data = await res.json();
        const results: ITunesResult[] = data.results || [];

        return results
            .map(mapITunesTrack)
            .filter((t): t is MappedTrack => t !== null);
    } catch (err) {
        console.error('[Music API] iTunes search error:', err);
        return [];
    }
}

async function getTrendingTracks(): Promise<MappedTrack[]> {
    // Pick 3 random queries to get a diverse mix
    const shuffled = [...TRENDING_QUERIES].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);

    const promises = selected.map(q => searchItunes(q, 8));
    const results = await Promise.all(promises);

    // Flatten, deduplicate by trackId, and shuffle
    const seen = new Set<string>();
    const all: MappedTrack[] = [];

    for (const tracks of results) {
        for (const track of tracks) {
            if (!seen.has(track.id)) {
                seen.add(track.id);
                all.push(track);
            }
        }
    }

    return all.sort(() => Math.random() - 0.5);
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();
    const category = (searchParams.get('category') || '').trim();

    let tracks: MappedTrack[];

    if (query) {
        // User typed a search query — search iTunes directly
        tracks = await searchItunes(query, 25);
    } else if (category && CATEGORY_TERMS[category]) {
        // Category tab selected — search by genre term
        tracks = await searchItunes(CATEGORY_TERMS[category], 25);
    } else {
        // No query, no category — return trending/popular mix
        tracks = await getTrendingTracks();
    }

    return NextResponse.json(
        { tracks, total: tracks.length },
        {
            headers: {
                'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=900',
            },
        }
    );
}
