import { NextRequest, NextResponse } from 'next/server';
import { getArtistReleases } from '@/lib/qobuz-dl-server';
import z from 'zod';

const releasesParamsSchema = z.object({
    artist_id: z.string().min(1, 'ID is required'),
    release_type: z.enum(['album', 'live', 'compilation', 'epSingle', 'download']).default('album'),
    track_size: z.coerce.number().int().positive().default(1000),
    offset: z.coerce.number().int().min(0, 'Offset must be 0 or greater').default(0),
    limit: z.coerce.number().int().positive().default(10)
});

export async function GET(request: NextRequest) {
    const country = request.headers.get('Token-Country');
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    try {
        const { artist_id, release_type, track_size, offset, limit } = releasesParamsSchema.parse(params);
        const data = await getArtistReleases(artist_id, release_type, limit, offset, track_size, country ? { country } : {});
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
