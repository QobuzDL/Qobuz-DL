import { getTokenForCountry, tokenCountriesMap } from '@/config/token-countries';
import { APIOptionProps, QobuzArtist, QobuzSearchResults } from './qobuz-dl';
import axios from 'axios';

// Functions only to be used by servers
// Do not import this file into the client

const QOBUZ_ALBUM_URL_REGEX = /https:\/\/(play|open)\.qobuz\.com\/album\/[a-zA-Z0-9]+/;
const QOBUZ_TRACK_URL_REGEX = /https:\/\/(play|open)\.qobuz\.com\/track\/\d+/;
const QOBUZ_ARTIST_URL_REGEX = /https:\/\/(play|open)\.qobuz\.com\/artist\/\d+/;
const QOBUZ_PLAYLIST_URL_REGEX = /https:\/\/(play|open)\.qobuz\.com\/playlist\/\d+/;

let crypto: any;
let SocksProxyAgent: any;
if (typeof window === 'undefined') {
    crypto = await import('node:crypto');
    SocksProxyAgent = (await import('socks-proxy-agent'))['SocksProxyAgent'];
}

export function testForRequirements() {
    if (process.env.QOBUZ_APP_ID?.length === 0) throw new Error('Deployment is missing QOBUZ_APP_ID environment variable.');
    if (process.env.QOBUZ_AUTH_TOKENS?.length === 0) throw new Error('Deployment is missing QOBUZ_AUTH_TOKENS environment variable.');
    if (process.env.QOBUZ_SECRET?.length === 0) throw new Error('Deployment is missing QOBUZ_SECRET environment variable.');
    if (process.env.QOBUZ_API_BASE?.length === 0) throw new Error('Deployment is missing QOBUZ_API_BASE environment variable.');
    return true;
}

export function getRandomToken() {
    if (tokenCountriesMap.length > 0) return tokenCountriesMap[0].token;
    return JSON.parse(process.env.QOBUZ_AUTH_TOKENS!)[Math.floor(Math.random() * JSON.parse(process.env.QOBUZ_AUTH_TOKENS!).length)] as string;
}

export async function search(query: string, limit: number = 10, offset: number = 0, options?: APIOptionProps) {
    testForRequirements();
    const { country, ...requestOptions } = options || {};
    const token = country ? getTokenForCountry(country) : getRandomToken();

    // Test if query is a Qobuz URL or ID
    let id: string | null = null;
    let switchTo: string | null = null;
    
    if (query.trim().match(QOBUZ_ALBUM_URL_REGEX)) {
        id = query.trim().match(QOBUZ_ALBUM_URL_REGEX)![0].replace('https://open', '').replace('https://play', '').replace('.qobuz.com/album/', '');
        switchTo = 'albums';
    } else if (query.trim().match(QOBUZ_TRACK_URL_REGEX)) {
        id = query.trim().match(QOBUZ_TRACK_URL_REGEX)![0].replace('https://open', '').replace('https://play', '').replace('.qobuz.com/track/', '');
        switchTo = 'tracks';
    } else if (query.trim().match(QOBUZ_ARTIST_URL_REGEX)) {
        id = query.trim().match(QOBUZ_ARTIST_URL_REGEX)![0].replace('https://open', '').replace('https://play', '').replace('.qobuz.com/artist/', '');
        switchTo = 'artists';
    } else if (query.trim().match(QOBUZ_PLAYLIST_URL_REGEX)) {
        id = query.trim().match(QOBUZ_PLAYLIST_URL_REGEX)![0].replace('https://open', '').replace('https://play', '').replace('.qobuz.com/playlist/', '');
        switchTo = 'playlists';
        
        // For playlists, fetch directly from playlist API
        const playlistData = await getPlaylistInfo(id, options);
        return {
            query,
            switchTo,
            albums: { limit: 0, offset: 0, total: 0, items: [] },
            tracks: { limit: 0, offset: 0, total: 0, items: [] },
            artists: { limit: 0, offset: 0, total: 0, items: [] },
            playlists: { limit: 1, offset: 0, total: 1, items: [playlistData] }
        } as QobuzSearchResults;
    }
    
    // Else, search Qobuz database
    const url = new URL(process.env.QOBUZ_API_BASE + 'catalog/search');
    url.searchParams.append('query', id || query);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());
    let proxyAgent = undefined;
    if (process.env.SOCKS5_PROXY) {
        proxyAgent = new SocksProxyAgent('socks5://' + process.env.SOCKS5_PROXY);
    }
    const response = await axios.get(process.env.CORS_PROXY ? process.env.CORS_PROXY + encodeURIComponent(url.toString()) : url.toString(), {
        headers: {
            'x-app-id': process.env.QOBUZ_APP_ID!,
            'x-user-auth-token': token,
            'User-Agent': process.env.CORS_PROXY ? 'Qobuz-DL' : undefined
        },
        httpAgent: proxyAgent,
        httpsAgent: proxyAgent,
        ...requestOptions
    });
    
    // Add empty playlists array if not present
    if (!response.data.playlists) {
        response.data.playlists = { limit: 0, offset: 0, total: 0, items: [] };
    }
    
    return {
        ...response.data,
        switchTo
    } as QobuzSearchResults;
}

export async function getArtist(artistId: string, options?: APIOptionProps): Promise<QobuzArtist | null> {
    testForRequirements();
    const { country, ...requestOptions } = options || {};
    const token = country ? getTokenForCountry(country) : getRandomToken();

    const url = new URL(process.env.QOBUZ_API_BASE + '/artist/page');
    let proxyAgent = undefined;
    if (process.env.SOCKS5_PROXY) {
        proxyAgent = new SocksProxyAgent('socks5://' + process.env.SOCKS5_PROXY);
    }
    return (
        await axios.get(process.env.CORS_PROXY ? process.env.CORS_PROXY + encodeURIComponent(url.toString()) : url.toString(), {
            params: { artist_id: artistId, sort: 'release_date' },
            headers: {
                'x-app-id': process.env.QOBUZ_APP_ID!,
                'x-user-auth-token': token,
                'User-Agent': process.env.CORS_PROXY ? 'Qobuz-DL' : undefined
            },
            httpAgent: proxyAgent,
            httpsAgent: proxyAgent,
            ...requestOptions
        })
    ).data;
}

export async function getArtistReleases(
    artist_id: string,
    release_type: string = 'album',
    limit: number = 10,
    offset: number = 0,
    track_size: number = 1000,
    options?: APIOptionProps
) {
    testForRequirements();
    const { country, ...requestOptions } = options || {};
    const token = country ? getTokenForCountry(country) : getRandomToken();

    const url = new URL(process.env.QOBUZ_API_BASE + 'artist/getReleasesList');
    url.searchParams.append('artist_id', artist_id);
    url.searchParams.append('release_type', release_type);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());
    url.searchParams.append('track_size', track_size.toString());
    url.searchParams.append('sort', 'release_date');
    let proxyAgent = undefined;
    if (process.env.SOCKS5_PROXY) {
        proxyAgent = new SocksProxyAgent('socks5://' + process.env.SOCKS5_PROXY);
    }
    const response = await axios.get(process.env.CORS_PROXY ? process.env.CORS_PROXY + encodeURIComponent(url.toString()) : url.toString(), {
        headers: {
            'x-app-id': process.env.QOBUZ_APP_ID!,
            'x-user-auth-token': token,
            'User-Agent': process.env.CORS_PROXY ? 'Qobuz-DL' : undefined
        },
        httpAgent: proxyAgent,
        httpsAgent: proxyAgent,
        ...requestOptions
    });
    return response.data;
}

export async function getAlbumInfo(album_id: string, options?: APIOptionProps) {
    testForRequirements();
    const { country, ...requestOptions } = options || {};
    const token = country ? getTokenForCountry(country) : getRandomToken();

    const url = new URL(process.env.QOBUZ_API_BASE + 'album/get');
    url.searchParams.append('album_id', album_id);
    url.searchParams.append('extra', 'track_ids');
    let proxyAgent = undefined;
    if (process.env.SOCKS5_PROXY) {
        proxyAgent = new SocksProxyAgent('socks5://' + process.env.SOCKS5_PROXY);
    }
    const response = await axios.get(process.env.CORS_PROXY ? process.env.CORS_PROXY + encodeURIComponent(url.toString()) : url.toString(), {
        headers: {
            'x-app-id': process.env.QOBUZ_APP_ID!,
            'x-user-auth-token': token,
            'User-Agent': process.env.CORS_PROXY ? 'Qobuz-DL' : undefined
        },
        httpAgent: proxyAgent,
        httpsAgent: proxyAgent,
        ...requestOptions
    });
    return response.data;
}

export async function getDownloadURL(trackID: number, quality: string, options?: APIOptionProps) {
    testForRequirements();
    const { country, ...requestOptions } = options || {};
    const token = country ? getTokenForCountry(country) : getRandomToken();

    const timestamp = Math.floor(new Date().getTime() / 1000);
    const r_sig = `trackgetFileUrlformat_id${quality}intentstreamtrack_id${trackID}${timestamp}${process.env.QOBUZ_SECRET}`;
    const r_sig_hashed = crypto.createHash('md5').update(r_sig).digest('hex');
    const url = new URL(process.env.QOBUZ_API_BASE + 'track/getFileUrl');
    url.searchParams.append('format_id', quality);
    url.searchParams.append('intent', 'stream');
    url.searchParams.append('track_id', trackID.toString());
    url.searchParams.append('request_ts', timestamp.toString());
    url.searchParams.append('request_sig', r_sig_hashed);
    let proxyAgent = undefined;
    if (process.env.SOCKS5_PROXY) {
        proxyAgent = new SocksProxyAgent('socks5://' + process.env.SOCKS5_PROXY);
    }
    const response = await axios.get(process.env.CORS_PROXY ? process.env.CORS_PROXY + encodeURIComponent(url.toString()) : url.toString(), {
        headers: {
            'x-app-id': process.env.QOBUZ_APP_ID!,
            'x-user-auth-token': token,
            'User-Agent': process.env.CORS_PROXY ? 'Qobuz-DL' : undefined
        },
        httpAgent: proxyAgent,
        httpsAgent: proxyAgent,
        ...requestOptions
    });
    return response.data.url;
}
export async function getPlaylistInfo(playlist_id: string, options?: APIOptionProps) {
    testForRequirements();
    const { country, ...requestOptions } = options || {};
    const token = country ? getTokenForCountry(country) : getRandomToken();

    const url = new URL(process.env.QOBUZ_API_BASE + 'playlist/get');
    url.searchParams.append('playlist_id', playlist_id);
    url.searchParams.append('extra', 'tracks');
    url.searchParams.append('limit', '500');
    
    let proxyAgent = undefined;
    if (process.env.SOCKS5_PROXY) {
        proxyAgent = new SocksProxyAgent('socks5://' + process.env.SOCKS5_PROXY);
    }
    
    const response = await axios.get(
        process.env.CORS_PROXY ? process.env.CORS_PROXY + encodeURIComponent(url.toString()) : url.toString(),
        {
            headers: {
                'x-app-id': process.env.QOBUZ_APP_ID!,
                'x-user-auth-token': token,
                'User-Agent': process.env.CORS_PROXY ? 'Qobuz-DL' : undefined
            },
            httpAgent: proxyAgent,
            httpsAgent: proxyAgent,
            ...requestOptions
        }
    );
    return response.data;
}
