import axios, { AxiosRequestConfig } from 'axios';
import { LucideIcon } from 'lucide-react';

export type APIOptionProps = Partial<
    AxiosRequestConfig & {
        country: string;
    }
>;

export type QobuzGenre = {
    path: number[];
    color: string;
    name: string;
    id: number;
};

export type QobuzLabel = {
    name: string;
    id: number;
    albums_count: number;
};

export type QobuzArtist = {
    image: {
        small: string;
        medium: string;
        large: string;
        extralarge: string;
        mega: string;
    } | null;
    name: string;
    id: number;
    albums_count: number;
};

export type QobuzTrack = {
    isrc: string | null;
    copyright: string;
    maximum_bit_depth: number;
    maximum_sampling_rate: number;
    performer: {
        name: string;
        id: number;
    };
    composer?: {
        name: string;
        id: number;
    };
    album: QobuzAlbum;
    track_number: number;
    released_at: number;
    title: string;
    version: string | null;
    duration: number;
    parental_warning: boolean;
    id: number;
    hires: boolean;
    streamable: boolean;
    media_number: number;
};

export type FetchedQobuzAlbum = QobuzAlbum & {
    tracks: {
        offset: number;
        limit: number;
        total: number;
        items: QobuzTrack[];
    };
};

export type QobuzAlbum = {
    maximum_bit_depth: number;
    image: {
        small: string;
        thumbnail: string;
        large: string;
        back: string | null;
    };
    artist: QobuzArtist;
    artists: {
        id: number;
        name: string;
        roles: string[];
    }[];
    released_at: number;
    label: QobuzLabel;
    title: string;
    qobuz_id: number;
    version: string | null;
    duration: number;
    parental_warning: boolean;
    tracks_count: number;
    genre: QobuzGenre;
    id: string;
    maximum_sampling_rate: number;
    release_date_original: string;
    hires: boolean;
    upc: string;
    streamable: boolean;
};

export type QobuzSearchResults = {
    query: string;
    switchTo: QobuzSearchFilters | null;
    albums: {
        limit: number;
        offset: number;
        total: number;
        items: QobuzAlbum[];
    };
    tracks: {
        limit: number;
        offset: number;
        total: number;
        items: QobuzTrack[];
    };
    artists: {
        limit: number;
        offset: number;
        total: number;
        items: QobuzArtist[];
    };
};

export type QobuzArtistResults = {
    artist: {
        id: string;
        name: {
            display: string;
        };
        artist_category: string;
        biography: {
            content: string;
            source: null;
            language: string;
        };
        images: {
            portrait: {
                hash: string;
                format: string;
            };
        };
        top_tracks: QobuzTrack[];
        releases: {
            album: {
                has_more: boolean;
                items: QobuzAlbum[];
            };
            live: {
                has_more: boolean;
                items: QobuzAlbum[];
            };
            compilation: {
                has_more: boolean;
                items: QobuzAlbum[];
            };
            epSingle: {
                has_more: boolean;
                items: QobuzAlbum[];
            };
        };
    };
};

export type FilterDataType = {
    label: string;
    value: string;
    searchRoute?: string;
    icon: LucideIcon;
}[];

export type QobuzSearchFilters = 'albums' | 'tracks' | 'artists';

export const QOBUZ_ALBUM_URL_REGEX = /https:\/\/(play|open)\.qobuz\.com\/album\/[a-zA-Z0-9]+/;
export const QOBUZ_TRACK_URL_REGEX = /https:\/\/(play|open)\.qobuz\.com\/track\/\d+/;
export const QOBUZ_ARTIST_URL_REGEX = /https:\/\/(play|open)\.qobuz\.com\/artist\/\d+/;

export function getAlbum(input: QobuzAlbum | QobuzTrack | QobuzArtist) {
    return ((input as QobuzAlbum).image ? input : (input as QobuzTrack).album) as QobuzAlbum;
}

export function formatTitle(input: QobuzAlbum | QobuzTrack | QobuzArtist) {
    return `${(input as QobuzAlbum | QobuzTrack).title ?? (input as QobuzArtist).name}${(input as QobuzAlbum | QobuzTrack).version ? ' (' + (input as QobuzAlbum | QobuzTrack).version + ')' : ''}`.trim();
}

export function getFullResImageUrl(input: QobuzAlbum | QobuzTrack) {
    return getAlbum(input).image.large.substring(0, getAlbum(input).image.large.length - 7) + 'org.jpg';
}

export function formatArtists(input: QobuzAlbum | QobuzTrack, separator: string = ', ') {
    return (getAlbum(input) as QobuzAlbum).artists && (getAlbum(input) as QobuzAlbum).artists.length > 0
        ? (getAlbum(input) as QobuzAlbum).artists.map((artist) => artist.name).join(separator)
        : (input as QobuzTrack).performer?.name || 'Various Artists';
}

export function filterExplicit(results: QobuzSearchResults, explicit: boolean = true) {
    return {
        ...results,
        albums: {
            ...results.albums,
            items: results.albums.items.filter((album) => (explicit ? true : !album.parental_warning))
        },
        tracks: {
            ...results.tracks,
            items: results.tracks.items.filter((track) => (explicit ? true : !track.parental_warning))
        }
    };
}

export function formatDuration(seconds: number) {
    if (!seconds) return '0m';
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const remainingSeconds = seconds % 60;

    return `${hours > 0 ? hours + 'h ' : ''} ${remainingMinutes > 0 ? remainingMinutes + 'm ' : ''} ${remainingSeconds > 0 && hours <= 0 ? remainingSeconds + 's' : ''}`.trim();
}

export function getType(input: QobuzAlbum | QobuzTrack | QobuzArtist): QobuzSearchFilters {
    if ('albums_count' in input) return 'artists';
    if ('album' in input) return 'tracks';
    return 'albums';
}

export function parseArtistAlbumData(album: QobuzAlbum) {
    album.maximum_sampling_rate = (album as any).audio_info.maximum_sampling_rate;
    album.maximum_bit_depth = (album as any).audio_info.maximum_bit_depth;
    album.streamable = (album as any).rights.streamable;
    album.released_at = new Date((album as any).dates.stream).getTime() / 1000;
    album.release_date_original = (album as any).dates.original;
    return album;
}

export function parseArtistData(artistData: QobuzArtistResults) {
    // Fix weird inconsistencies in Qobuz API data
    if ((!artistData.artist.releases as any).length) return artistData;
    (artistData.artist.releases as any).forEach((release: any) =>
        release.items.forEach((album: any, index: number) => {
            release.items[index] = parseArtistAlbumData(album);
        })
    );
    const newReleases = {} as any;
    for (const type of ['album', 'live', 'compilation', 'epSingle']) {
        if (!(artistData.artist.releases as any).find((release: any) => release.type === type)) continue;
        newReleases[type] = {
            has_more: (artistData.artist.releases as any).find((release: any) => release.type === type)!.has_more,
            items: (artistData.artist.releases as any).find((release: any) => release.type === type)!.items
        };
    }
    artistData.artist.releases = newReleases;
    return artistData;
}

export async function getFullAlbumInfo(
    fetchedAlbumData: FetchedQobuzAlbum | null,
    setFetchedAlbumData: React.Dispatch<React.SetStateAction<FetchedQobuzAlbum | null>>,
    result: QobuzAlbum,
    country?: string
) {
    if (fetchedAlbumData && (fetchedAlbumData as FetchedQobuzAlbum).id === (result as QobuzAlbum).id) return fetchedAlbumData;
    setFetchedAlbumData(null);
    const albumDataResponse = await axios.get('/api/get-album', { params: { album_id: (result as QobuzAlbum).id }, headers: { 'Token-Country': country } });
    setFetchedAlbumData(albumDataResponse.data.data);
    return albumDataResponse.data.data;
}
