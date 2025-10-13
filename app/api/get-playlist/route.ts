import { getPlaylistInfo } from '@/lib/qobuz-dl-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    let playlist_id = searchParams.get('playlist_id');
    const q = searchParams.get('q');
    const country = request.headers.get('Token-Country') || undefined;
    
    // If q parameter is provided (from search), extract playlist ID
    if (q && !playlist_id) {
        const QOBUZ_PLAYLIST_URL_REGEX = /https:\/\/(play|open)\.qobuz\.com\/playlist\/(\d+)/;
        const match = q.match(QOBUZ_PLAYLIST_URL_REGEX);
        if (match) {
            playlist_id = match[2];
        } else if (/^\d+$/.test(q)) {
            // If it's just numbers, use as playlist_id
            playlist_id = q;
        }
    }
    
    if (!playlist_id) {
        return NextResponse.json({ error: 'Missing playlist_id parameter' }, { status: 400 });
    }
    
    try {
        const data = await getPlaylistInfo(playlist_id, { country });
        
        // Return in search results format
        return NextResponse.json({ 
            success: true,
            data: {
                query: q || playlist_id,
                switchTo: 'playlists',
                albums: { limit: 0, offset: 0, total: 0, items: [] },
                tracks: { limit: 0, offset: 0, total: 0, items: [] },
                artists: { limit: 0, offset: 0, total: 0, items: [] },
                playlists: { limit: 1, offset: 0, total: 1, items: [data] }
            }
        });
    } catch (error: any) {
        console.error('Error fetching playlist:', error);
        return NextResponse.json(
            { error: error.response?.data || error.message },
            { status: error.response?.status || 500 }
        );
    }
}
