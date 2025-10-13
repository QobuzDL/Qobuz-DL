import axios, { AxiosError } from 'axios';
import saveAs from 'file-saver';
import { applyMetadata, codecMap, FFmpegType, fixMD5Hash, loadFFmpeg } from './ffmpeg-functions';
import { artistReleaseCategories } from '@/components/artist-dialog';
import { cleanFileName, formatBytes, formatCustomTitle, resizeImage } from './utils';
import { createJob } from './status-bar/jobs';
import { Disc3Icon, DiscAlbumIcon } from 'lucide-react';
import { FetchedQobuzAlbum, formatTitle, getFullResImageUrl, QobuzAlbum, QobuzArtistResults, QobuzPlaylist, QobuzTrack } from './qobuz-dl';
import { SettingsProps } from './settings-provider';
import { StatusBarProps } from '@/components/status-bar/status-bar';
import { ToastAction } from '@/components/ui/toast';
import { zipSync } from 'fflate';

export const createDownloadJob = async (
    result: QobuzAlbum | QobuzTrack | QobuzPlaylist,
    setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>,
    ffmpegState: FFmpegType,
    settings: SettingsProps,
    toast: (toast: any) => void,
    fetchedAlbumData?: FetchedQobuzAlbum | null,
    setFetchedAlbumData?: React.Dispatch<React.SetStateAction<FetchedQobuzAlbum | null>>,
    country?: string
) => {
    const isPlaylist = 'owner' in result;
    if ((result as QobuzTrack).album) {
        // Single track download
        const formattedTitle = formatCustomTitle(settings.trackName, result as QobuzTrack);
        await createJob(setStatusBar, formattedTitle, Disc3Icon, async () => {
            return new Promise(async (resolve) => {
                try {
                    const controller = new AbortController();
                    const signal = controller.signal;
                    let cancelled = false;
                    setStatusBar((prev) => ({
                        ...prev,
                        progress: 0,
                        title: `Downloading ${formatTitle(result)}`,
                        description: `Loading FFmpeg`,
                        onCancel: () => {
                            cancelled = true;
                            controller.abort();
                        }
                    }));
                    if (
                        settings.applyMetadata ||
                        !((settings.outputQuality === '27' && settings.outputCodec === 'FLAC') || (settings.bitrate === 320 && settings.outputCodec === 'MP3'))
                    )
                        await loadFFmpeg(ffmpegState, signal);
                    setStatusBar((prev) => ({ ...prev, description: 'Fetching track size...' }));
                    const APIResponse = await axios.get('/api/download-music', {
                        headers: {
                            'Token-Country': country
                        },
                        params: { track_id: (result as QobuzTrack).id, quality: settings.outputQuality },
                        signal
                    });
                    const trackURL = APIResponse.data.data.url;
                    const fileSizeResponse = await axios.head(trackURL, { signal });
                    const fileSize = fileSizeResponse.headers['content-length'];
                    const response = await axios.get(trackURL, {
                        responseType: 'arraybuffer',
                        onDownloadProgress: (progressEvent) => {
                            setStatusBar((statusbar) => {
                                if (statusbar.processing && !cancelled)
                                    return {
                                        ...statusbar,
                                        progress: Math.floor((progressEvent.loaded / fileSize) * 100),
                                        description: `${formatBytes(progressEvent.loaded)} / ${formatBytes(fileSize)}`
                                    };
                                else return statusbar;
                            });
                        },
                        signal
                    });
                    setStatusBar((prev) => ({ ...prev, description: `Applying metadata...`, progress: 100 }));
                    const inputFile = response.data;
                    let outputFile = await applyMetadata(inputFile, result as QobuzTrack, ffmpegState, settings, setStatusBar);
                    if (settings.outputCodec === 'FLAC' && settings.fixMD5) outputFile = await fixMD5Hash(outputFile, setStatusBar);
                    const objectURL = URL.createObjectURL(new Blob([outputFile]));
                    const title = formattedTitle + '.' + codecMap[settings.outputCodec].extension;
                    const audioElement = document.createElement('audio');
                    audioElement.id = `track_${result.id}`;
                    audioElement.src = objectURL;
                    audioElement.onloadedmetadata = function () {
                        if (Math.round(audioElement.duration) >= Math.round(result.duration)) {
                            proceedDownload(objectURL, title);
                            resolve();
                        } else {
                            toast({
                                title: 'Error',
                                description: `Qobuz provided a file shorter than expected for "${title}". This can indicate the file being a sample track rather than the full track`,
                                duration: Infinity,
                                action: (
                                    <ToastAction
                                        altText='Copy Stack'
                                        onClick={() => {
                                            proceedDownload(objectURL, title);
                                        }}
                                    >
                                        Download anyway
                                    </ToastAction>
                                )
                            });
                            resolve();
                        }
                    };
                    document.body.append(audioElement);
                } catch (e) {
                    if (e instanceof AxiosError && e.code === 'ERR_CANCELED') resolve();
                    else {
                        toast({
                            title: 'Error',
                            description: e instanceof Error ? e.message : 'An unknown error occurred',
                            action: (
                                <ToastAction altText='Copy Stack' onClick={() => navigator.clipboard.writeText((e as Error).stack!)}>
                                    Copy Stack
                                </ToastAction>
                            )
                        });
                        resolve();
                    }
                }
            });
        });
    } else {
        // Album or Playlist download
        const formattedZipTitle = isPlaylist ? (result as QobuzPlaylist).name : formatCustomTitle(settings.zipName, result as QobuzAlbum);

        await createJob(setStatusBar, formattedZipTitle, DiscAlbumIcon, async () => {
            return new Promise(async (resolve) => {
                try {
                    const controller = new AbortController();
                    const signal = controller.signal;
                    let cancelled = false;
                    setStatusBar((prev) => ({
                        ...prev,
                        progress: 0,
                        title: `Downloading ${formatTitle(result)}`,
                        description: `Loading FFmpeg...`,
                        onCancel: () => {
                            cancelled = true;
                            controller.abort();
                        }
                    }));
                    if (
                        settings.applyMetadata ||
                        !((settings.outputQuality === '27' && settings.outputCodec === 'FLAC') || (settings.bitrate === 320 && settings.outputCodec === 'MP3'))
                    )
                        await loadFFmpeg(ffmpegState, signal);
                    setStatusBar((prev) => ({ ...prev, description: isPlaylist ? 'Fetching playlist data...' : 'Fetching album data...' }));
                    
                    let playlistData: QobuzPlaylist | null = null;
                    
                    if (isPlaylist) {
                        const playlistResponse = await axios.get('/api/get-playlist', {
                            params: { playlist_id: (result as QobuzPlaylist).id },
                            headers: { 'Token-Country': country },
                            signal
                        });
                        if (playlistResponse.data.success && playlistResponse.data.data.playlists) {
                            playlistData = playlistResponse.data.data.playlists.items[0];
                        } else {
                            playlistData = playlistResponse.data.data;
                        }
                    } else if (!fetchedAlbumData) {
                        const albumDataResponse = await axios.get('/api/get-album', {
                            params: { album_id: (result as QobuzAlbum).id },
                            headers: { 'Token-Country': country },
                            signal
                        });
                        if (setFetchedAlbumData) {
                            setFetchedAlbumData(albumDataResponse.data.data);
                        }
                        fetchedAlbumData = albumDataResponse.data.data;
                    }
                    
                    const albumTracks = isPlaylist
                        ? playlistData!.tracks.items.map((track: QobuzTrack) => {
                            if (!track.album) {
                                return {
                                    ...track,
                                    album: {
                                        title: playlistData!.name,
                                        artists: [],
                                        artist: { name: track.performer?.name || 'Various Artists', id: 0, albums_count: 0, image: null }
                                    } as any
                                };
                            }
                            return track;
                        })
                        : fetchedAlbumData!.tracks.items.map((track: QobuzTrack) => ({
                              ...track,
                              album: fetchedAlbumData
                          })) as QobuzTrack[];
                    
                    let totalAlbumSize = 0;
                    const trackUrlMap = new Map<number, string>();
                    setStatusBar((prev) => ({ ...prev, description: isPlaylist ? 'Fetching playlist size...' : 'Fetching album size...' }));
                    
                    for (const [index, track] of albumTracks.entries()) {
                        if (track && track.streamable) {
                            try {
                                const fileURLResponse = await axios.get('/api/download-music', {
                                    params: { track_id: track.id, quality: settings.outputQuality },
                                    headers: { 'Token-Country': country },
                                    signal
                                });
                                const trackURL = fileURLResponse.data.data.url;
                                trackUrlMap.set(index, trackURL);
                                
                                const fileSizeResponse = await axios.head(trackURL, { signal });
                                setStatusBar((statusBar) => ({
                                    ...statusBar,
                                    progress: (100 / albumTracks.length) * (index + 1)
                                }));
                                const fileSize = parseInt(fileSizeResponse.headers['content-length']);
                                totalAlbumSize += fileSize;
                            } catch (e) {
                                console.warn(`Failed to get URL for track ${index}:`, e);
                            }
                        }
                    }
                    
                    // Fetch album art
                    let albumArt: ArrayBuffer | false = false;
                    if (isPlaylist) {
                        const playlistImages = (result as QobuzPlaylist).images;
                        if (playlistImages && playlistImages.length > 0) {
                            try {
                                const response = await axios.get(playlistImages[0], { responseType: 'arraybuffer', signal });
                                albumArt = response.data;
                            } catch (e) {
                                console.warn('Failed to fetch playlist art:', e);
                            }
                        }
                    } else {
                        const albumArtURL = await resizeImage(getFullResImageUrl(fetchedAlbumData!), settings.albumArtSize, settings.albumArtQuality);
                        if (albumArtURL) {
                            try {
                                const response = await axios.get(albumArtURL, { responseType: 'arraybuffer', signal });
                                albumArt = response.data;
                            } catch (e) {
                                console.warn('Failed to fetch album art:', e);
                            }
                        }
                    }
                    
                    // Check if playlist is too large for ZIP (>1.5GB)
                    const estimatedZipSize = totalAlbumSize * 1.1;
                    if (isPlaylist && estimatedZipSize > 1500000000) {
                        // Download tracks individually for large playlists
                        toast({
                            title: 'Large Playlist',
                            description: 'Downloading tracks individually due to size'
                        });
                        
                        setStatusBar((prev) => ({ ...prev, progress: 0 }));
                        let completed = 0;
                        
                        for (const [index, url] of trackUrlMap.entries()) {
                            if (cancelled) break;
                            const track = albumTracks[index];
                            if (url && track) {
                                try {
                                    const response = await axios.get(url, { responseType: 'arraybuffer', signal });
                                    let outputFile = await applyMetadata(response.data, track, ffmpegState, settings, undefined, albumArt);
                                    if (settings.outputCodec === 'FLAC' && settings.fixMD5) {
                                        outputFile = await (await fixMD5Hash(outputFile)).arrayBuffer();
                                    }
                                    const fileName = `${(index + 1).toString().padStart(2, '0')} ${formatCustomTitle(settings.trackName, track)}.${codecMap[settings.outputCodec].extension}`;
                                    saveAs(URL.createObjectURL(new Blob([outputFile])), cleanFileName(fileName));
                                    completed++;
                                    setStatusBar((prev) => ({
                                        ...prev,
                                        progress: Math.floor((completed / trackUrlMap.size) * 100),
                                        description: `Downloaded ${completed}/${trackUrlMap.size} tracks`
                                    }));
                                    await new Promise(r => setTimeout(r, 500));
                                } catch (e) {
                                    console.error(`Failed track ${index}:`, e);
                                }
                            }
                        }
                        
                        if (albumArt !== false) {
                            saveAs(URL.createObjectURL(new Blob([albumArt], { type: 'image/jpeg' })), 'cover.jpg');
                        }
                        
                        setStatusBar((prev) => ({ ...prev, progress: 100 }));
                        resolve();
                        return;
                    }
                    
                    // Download and ZIP for smaller playlists/albums
                    const trackBuffers = [] as ArrayBuffer[];
                    let totalBytesDownloaded = 0;
                    setStatusBar((prev) => ({ ...prev, progress: 0 }));
                    
                    for (const [index, url] of trackUrlMap.entries()) {
                        if (url && albumTracks[index]) {
                            const response = await axios.get(url, {
                                responseType: 'arraybuffer',
                                onDownloadProgress: (progressEvent) => {
                                    if (totalBytesDownloaded + progressEvent.loaded < totalAlbumSize)
                                        setStatusBar((statusBar) => {
                                            if (statusBar.processing && !cancelled)
                                                return {
                                                    ...statusBar,
                                                    progress: Math.floor(((totalBytesDownloaded + progressEvent.loaded) / totalAlbumSize) * 100),
                                                    description: `${formatBytes(totalBytesDownloaded + progressEvent.loaded)} / ${formatBytes(totalAlbumSize)}`
                                                };
                                            else return statusBar;
                                        });
                                },
                                signal
                            });
                            await new Promise((r) => setTimeout(r, 100));
                            totalBytesDownloaded += response.data.byteLength;
                            const currentTrack = albumTracks[index];
                            if (currentTrack) {
                                let outputFile = await applyMetadata(
                                    response.data,
                                    currentTrack,
                                    ffmpegState,
                                    settings,
                                    undefined,
                                    albumArt,
                                    isPlaylist ? undefined : fetchedAlbumData!.upc
                                );
                                if (settings.outputCodec === 'FLAC' && settings.fixMD5) outputFile = await (await fixMD5Hash(outputFile)).arrayBuffer();
                                trackBuffers[index] = outputFile;
                            }
                        }
                    }
                    
                    setStatusBar((prev) => ({ ...prev, progress: 0, description: 'Creating ZIP...' }));
                    await new Promise((r) => setTimeout(r, 500));
                    
                    const zipFiles = {
                        ...(albumArt !== false ? { 'cover.jpg': new Uint8Array(albumArt) } : {}),
                        ...trackBuffers.reduce(
                            (acc, buffer, index) => {
                                if (buffer) {
                                    const fileName = `${(index + 1).toString().padStart(2, '0')} ${formatCustomTitle(settings.trackName, albumTracks[index])}.${codecMap[settings.outputCodec].extension}`;
                                    acc[cleanFileName(fileName)] = new Uint8Array(buffer);
                                }
                                return acc;
                            },
                            {} as { [key: string]: Uint8Array }
                        )
                    } as { [key: string]: Uint8Array };
                    
                    const zippedFile = zipSync(zipFiles, { level: 0 });
                    const zipBlob = new Blob([zippedFile as BlobPart], { type: 'application/zip' });
                    setStatusBar((prev) => ({ ...prev, progress: 100 }));
                    saveAs(URL.createObjectURL(zipBlob), formattedZipTitle + '.zip');
                    resolve();
                } catch (e) {
                    if (e instanceof AxiosError && e.code === 'ERR_CANCELED') resolve();
                    else {
                        toast({
                            title: 'Error',
                            description: e instanceof Error ? e.message : 'An unknown error occurred',
                            action: (
                                <ToastAction altText='Copy Stack' onClick={() => navigator.clipboard.writeText((e as Error).stack!)}>
                                    Copy Stack
                                </ToastAction>
                            )
                        });
                        resolve();
                    }
                }
            });
        });
    }
};

function proceedDownload(objectURL: string, title: string) {
    saveAs(objectURL, title);
    setTimeout(() => URL.revokeObjectURL(objectURL), 100);
}

export async function downloadArtistDiscography(
    artistResults: QobuzArtistResults,
    setArtistResults: React.Dispatch<React.SetStateAction<QobuzArtistResults | null>>,
    fetchMore: (searchField: any, artistResults: QobuzArtistResults) => Promise<void>,
    type: 'album' | 'epSingle' | 'live' | 'compilation' | 'all',
    setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>,
    settings: SettingsProps,
    toast: (toast: any) => void,
    ffmpegState: FFmpegType,
    country?: string
) {
    let types: ('album' | 'epSingle' | 'live' | 'compilation')[] = [];
    if (type === 'all') types = ['album', 'epSingle', 'live', 'compilation'];
    else types = [type];
    for (const type of types) {
        while (artistResults.artist.releases[type].has_more) {
            await fetchMore(type, artistResults);
            artistResults = (await loadArtistResults(setArtistResults)) as QobuzArtistResults;
        }
        for (const release of artistResults.artist.releases[type].items) {
            await createDownloadJob(release, setStatusBar, ffmpegState, settings, toast, undefined, undefined, country);
        }
    }
    toast({
        title: `Added all ${artistReleaseCategories.find((category) => category.value === type)?.label ?? 'releases'} by '${artistResults.artist.name.display}'`,
        description: 'All releases have been added to the queue'
    });
}

export async function loadArtistResults(setArtistResults: React.Dispatch<React.SetStateAction<QobuzArtistResults | null>>): Promise<QobuzArtistResults | null> {
    return new Promise((resolve) => {
        setArtistResults((prev: QobuzArtistResults | null) => (resolve(prev), prev));
    });
}
