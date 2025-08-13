import { NextRequest, NextResponse } from "next/server";
import { getArtist } from "@/lib/qobuz-dl";
import z from "zod";

const artistReleasesParamsSchema = z.object({
    artist_id: z.string().min(1, "ID is required")
})

export async function GET(request: NextRequest) {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    try {
        const { artist_id } = artistReleasesParamsSchema.parse(params);
        const artist = await getArtist(artist_id);
        return NextResponse.json({ success: true, data: { artist } }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error?.errors || error.message || "An error occurred parsing the request." }, { status: 400 });
    }
}