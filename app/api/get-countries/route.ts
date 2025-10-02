import { countryCodes } from '@/config/token-countries';
import { NextResponse } from 'next/server';

export async function GET() {
    return new NextResponse(
        JSON.stringify({
            success: true,
            data: countryCodes
        })
    );
}
