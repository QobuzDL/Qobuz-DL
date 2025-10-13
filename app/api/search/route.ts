// app/api/search/route.ts

import { NextRequest, NextResponse } from 'next/server';

const QOBUZ_APP_ID = process.env.QOBUZ_APP_ID!;
const QOBUZ_AUTH_TOKEN = process.env.QOBUZ_AUTH_TOKENS!;
const QOBUZ_API_BASE = 'https://www.qobuz.com/api.json/0.2';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type') || 'track';

  if (!query) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  const apiUrl = `${QOBUZ_API_BASE}/search/${type}?app_id=${QOBUZ_APP_ID}&user_auth_token=${QOBUZ_AUTH_TOKEN}&query=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (err) {
    console.error('[Qobuz API error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
