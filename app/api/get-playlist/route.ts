import { NextRequest, NextResponse } from 'next/server';
import { getPlaylistInfo } from '@/lib/qobuz-dl-server';
import z from 'zod';

const playlistInfoParamsSchema = z.object({
    playlist_id: z.string().min(1, 'ID is required')
});

export async function GET(request: NextRequest) {
    const country = request.headers.get('Token-Country');
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    try {
        const { playlist_id } = playlistInfoParamsSchema.parse(params);
        const data = await getPlaylistInfo(playlist_id, country ? { country } : {});
        return new NextResponse(JSON.stringify({ success: true, data }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(
            JSON.stringify({
                success: false,
                error: error?.errors || error.message || 'An error occurred parsing the request.'
            }),
            { status: 400 }
        );
    }
}
