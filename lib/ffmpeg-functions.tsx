import { formatArtists, formatTitle, getAlbum, getFullResImageUrl, QobuzTrack } from './qobuz-dl';
import axios from 'axios';
import { SettingsProps } from './settings-provider';
import { StatusBarProps } from '@/components/status-bar/status-bar';
import { resizeImage } from './utils';
import { parseMp4Atoms, rebuildMp4WithMetadata, MetadataAtoms } from './m4a-metadata'; 

declare const FFmpeg: { createFFmpeg: any; fetchFile: any };

export type FFmpegType = {
    FS: (action: string, filename: string, fileData?: Uint8Array) => Promise<any>;
    run: (...args: string[]) => Promise<any>;
    isLoaded: () => boolean;
    load: ({ signal }: { signal: AbortSignal }) => Promise<any>;
};

export const codecMap = {
    FLAC: { extension: 'flac', codec: 'flac' },
    WAV: { extension: 'wav', codec: 'pcm_s16le' },
    ALAC: { extension: 'm4a', codec: 'alac' },
    MP3: { extension: 'mp3', codec: 'libmp3lame' },
    AAC: { extension: 'm4a', codec: 'aac' },
    OPUS: { extension: 'opus', codec: 'libopus' }
};

// ==========================================
// 🚀 IMPLEMENTACIÓN DE LA COLA (QUEUE)
// ==========================================

// Promesa global para asegurar que ffmpeg procese de uno en uno
let ffmpegQueue = Promise.resolve();

export function applyMetadata(
    trackBuffer: ArrayBuffer,
    resultData: any,
    ffmpeg: FFmpegType,
    settings: SettingsProps,
    setStatusBar?: React.Dispatch<React.SetStateAction<StatusBarProps>>,
    albumArt?: ArrayBuffer | false,
    upc?: string
): Promise<any> {
    return new Promise((resolve, reject) => {
        // Encadena esta llamada a la promesa anterior
        ffmpegQueue = ffmpegQueue.then(async () => {
            try {
                // Ejecutamos la lógica real de forma segura
                const result = await applyMetadataCore(
                    trackBuffer, resultData, ffmpeg, settings, setStatusBar, albumArt, upc
                );
                resolve(result);
            } catch (error) {
                console.error("Error procesando FFmpeg en la cola:", error);
                reject(error); // Permite que la app principal maneje el error
            }
        });
    });
}

// ==========================================

async function cleanAndFinish(
    extension: string, 
    resultData: any, 
    setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>> | undefined, 
    ffmpeg: FFmpegType
) {
    if (setStatusBar) {
        setStatusBar((prev) => ({
            ...prev,
            description: `Finished: ${resultData.title}`,
            progress: 100
        }));
    }

    const files = [
        'input.' + extension, 'metadata.txt', 'secondInput.' + extension, 
        'albumArt.jpg', 'output.' + extension, 'input.flac', 'input.mp3'
    ];
    for (const f of files) {
        try { await ffmpeg.FS('unlink', f); } catch (e) { }
    }
}

// Renombrada a applyMetadataCore (sin el 'export')
async function applyMetadataCore(
    trackBuffer: ArrayBuffer,
    resultData: any, 
    ffmpeg: FFmpegType,
    settings: SettingsProps,
    setStatusBar?: React.Dispatch<React.SetStateAction<StatusBarProps>>,
    albumArt?: ArrayBuffer | false,
    upc?: string
) {
    const extension = codecMap[settings.outputCodec as keyof typeof codecMap].extension;
    const skipRencode =
        (settings.outputQuality != '5' && settings.outputCodec === 'FLAC') ||
        (settings.outputQuality === '5' && settings.outputCodec === 'MP3' && settings.bitrate === 320);

    if (skipRencode && !settings.applyMetadata) return trackBuffer;

    if (!skipRencode) {
        const inputExtension = settings.outputQuality === '5' ? 'mp3' : 'flac';
        if (setStatusBar) setStatusBar((prev) => ({ ...prev, description: 'Re-encoding track...' }));

        await ffmpeg.FS('writeFile', 'input.' + inputExtension, new Uint8Array(trackBuffer));
        await ffmpeg.run(
            '-i', 'input.' + inputExtension,
            '-c:a', codecMap[settings.outputCodec as keyof typeof codecMap].codec,
            settings.bitrate ? '-b:a' : '',
            settings.bitrate ? settings.bitrate + 'k' : '',
            ['OPUS'].includes(settings.outputCodec) ? '-vbr' : '',
            ['OPUS'].includes(settings.outputCodec) ? 'on' : '',
            'output.' + extension
        );
        trackBuffer = await ffmpeg.FS('readFile', 'output.' + extension);
        await ffmpeg.FS('unlink', 'input.' + inputExtension);
        await ffmpeg.FS('unlink', 'output.' + extension);
    }

    if (!settings.applyMetadata || settings.outputCodec === 'WAV') return trackBuffer;

    if (setStatusBar) setStatusBar((prev) => ({ ...prev, description: 'Applying metadata...' }));

    const isExplicit = resultData.parental_warning === true || String(resultData.parental_warning) === 'true' || String(resultData.parental_warning) === '1';

    // --- MANEJO DE PORTADA ---
    if (albumArt !== false && !albumArt) {
        const albumArtURL = await resizeImage(getFullResImageUrl(resultData), settings.albumArtSize, settings.albumArtQuality);
        if (albumArtURL) {
            albumArt = (await axios.get(albumArtURL, { responseType: 'arraybuffer' })).data;
        }
    }

    // SI ES M4A, USAMOS NUESTRO SCRIPT NATIVO
    if (extension === 'm4a') {
        if (setStatusBar) setStatusBar((prev) => ({ ...prev, description: 'Escribiendo átomos MP4 nativos...' }));
        
        const cleanBuffer = trackBuffer instanceof Uint8Array 
            ? trackBuffer.buffer.slice(trackBuffer.byteOffset, trackBuffer.byteOffset + trackBuffer.byteLength)
            : trackBuffer;
            
        const dataView = new DataView(cleanBuffer);
        const atoms = parseMp4Atoms(dataView);

        const metadataAtoms: MetadataAtoms = {
            tags: {
                '©nam': formatTitle(resultData),
                '©ART': formatArtists(resultData),
                'aART': formatArtists(resultData),
                '©alb': formatTitle(resultData.album),
                '©gen': resultData.album?.genre?.name || '',
                '©day': resultData.album?.release_date_original ? String(new Date(resultData.album.release_date_original).getFullYear()) : '',
                'cprt': resultData.copyright || '',
            },
            userTags: [],
            cover: albumArt ? { data: new Uint8Array(albumArt as ArrayBuffer) } : null
        };

        if (resultData.isrc) metadataAtoms.tags['ISRC'] = resultData.isrc;
        if (resultData.track_number) {
            metadataAtoms.tags['trkn'] = {
                current: resultData.track_number,
                total: resultData.album?.tracks_count || 0
            };
        }
        
        // --- NUEVOS CAMPOS (Compositor, Grupo, BPM, Disco) ---
        if (resultData.composer && resultData.composer.name) {
            metadataAtoms.tags['©wrt'] = resultData.composer.name;
        }
        if (resultData.grouping) {
            metadataAtoms.tags['©grp'] = resultData.grouping;
        }
        if (resultData.bpm) {
            metadataAtoms.tags['tmpo'] = Math.round(resultData.bpm);
        }
        if (resultData.media_number) {
            metadataAtoms.tags['disk'] = {
                current: resultData.media_number,
                total: resultData.album?.maximum_volume_number || resultData.album?.media_count || 0
            };
        }
        
        // ¡El átomo binario mágico!
        if (isExplicit) {
            metadataAtoms.tags['rtng'] = 1;
        }

        const finalOutput = rebuildMp4WithMetadata(dataView, atoms, metadataAtoms);
        await cleanAndFinish(extension, resultData, setStatusBar, ffmpeg);
        return finalOutput;
    }

    // SI ES FLAC O MP3, USAMOS EL MÉTODO TRADICIONAL DE FFMPEG
    let metadata = `;FFMETADATA1\ntitle=${formatTitle(resultData)}\nartist=${formatArtists(resultData)}\nalbum_artist=${formatArtists(resultData)}\nalbum=${formatTitle(resultData.album)}\ngenre=${resultData.album?.genre?.name || ''}\ndate=${resultData.album?.release_date_original || ''}\nyear=${resultData.album?.release_date_original ? new Date(resultData.album.release_date_original).getFullYear() : ''}`;
    metadata += `\nlabel=${getAlbum(resultData)?.label?.name || ''}\ncopyright=${resultData.copyright || ''}`;
    
    if (resultData.isrc) metadata += `\nisrc=${resultData.isrc}`;
    if (upc) metadata += `\nbarcode=${upc}`;
    if (resultData.track_number) metadata += `\ntrack=${resultData.track_number}`;
    if (isExplicit) { metadata += `\nrating=1\nITUNESADVISORY=1`; }
    
    // --- NUEVOS CAMPOS para FFmpeg (FLAC/MP3) ---
    if (resultData.composer && resultData.composer.name) {
        metadata += `\ncomposer=${resultData.composer.name}`;
    }
    if (resultData.grouping) {
        metadata += `\ngrouping=${resultData.grouping}`;
    }
    if (resultData.bpm) {
        metadata += `\nTBPM=${Math.round(resultData.bpm)}\nbpm=${Math.round(resultData.bpm)}`;
    }
    if (resultData.media_number) {
        const totalDiscs = resultData.album?.maximum_volume_number || resultData.album?.media_count || '';
        metadata += `\ndisc=${resultData.media_number}${totalDiscs ? '/' + totalDiscs : ''}`;
    }

    await ffmpeg.FS('writeFile', 'input.' + extension, new Uint8Array(trackBuffer));
    await ffmpeg.FS('writeFile', 'metadata.txt', new TextEncoder().encode(metadata));

    const firstRunArgs = ['-i', 'input.' + extension, '-i', 'metadata.txt', '-map_metadata', '1', '-c', 'copy', 'secondInput.' + extension];
    await ffmpeg.run(...firstRunArgs);

    let finalOutput: Uint8Array;

    if (albumArt) {
        await ffmpeg.FS('writeFile', 'albumArt.jpg', new Uint8Array(albumArt as ArrayBuffer));
        const secondRunArgs = ['-i', 'secondInput.' + extension, '-i', 'albumArt.jpg', '-map', '0', '-map', '1', '-c', 'copy', '-disposition:v:0', 'attached_pic', '-map_metadata', '0', 'output.' + extension];
        await ffmpeg.run(...secondRunArgs);
        finalOutput = await ffmpeg.FS('readFile', 'output.' + extension);
    } else {
        finalOutput = await ffmpeg.FS('readFile', 'secondInput.' + extension);
    }

    await cleanAndFinish(extension, resultData, setStatusBar, ffmpeg);
    await new Promise(r => setTimeout(r, 500)); 
    
    return finalOutput;
}

export async function fixMD5Hash(trackBuffer: ArrayBuffer, setStatusBar?: React.Dispatch<React.SetStateAction<StatusBarProps>>): Promise<Blob> {
    return new Promise((resolve, reject) => {
        setStatusBar?.((prev) => ({ ...prev, description: 'Fixing MD5 hash...', progress: 0 }));

        const worker = new Worker('/flac/EmsWorkerProxy.js');

        worker.onerror = (err) => {
            console.error("Worker Error:", err);
            worker.terminate();
            reject(err);
        };

        worker.onmessage = function (e) {
            if (e.data && e.data.reply === 'progress') {
                const vals = e.data.values;
                if (vals[1]) {
                    setStatusBar?.((prev) => ({ ...prev, progress: Math.floor((vals[0] / vals[1]) * 100) }));
                }
            } else if (e.data && e.data.reply === 'done') {
                let resultBlob: Blob | null = null;
                for (const fileName in e.data.values) {
                    resultBlob = e.data.values[fileName].blob;
                    break; 
                }

                worker.terminate(); 
                
                if (resultBlob) {
                    resolve(resultBlob);
                } else {
                    reject(new Error("No se generó el archivo FLAC"));
                }
            }
        };

        worker.postMessage({
            command: 'encode',
            args: ['input.flac', '-o', 'output.flac'],
            outData: {
                'output.flac': {
                    MIME: 'audio/flac'
                }
            },
            fileData: {
                'input.flac': new Uint8Array(trackBuffer)
            }
        });
    });
}

export function createFFmpeg() {
    if (typeof FFmpeg === 'undefined') return null;
    const { createFFmpeg } = FFmpeg;
    
    const ffmpeg = createFFmpeg({ 
        log: true, 
        corePath: '/ffmpeg/ffmpeg-core.js',
        workerPath: '/ffmpeg/ffmpeg-core.worker.js',
        wasmPath: '/ffmpeg/ffmpeg-core.wasm'
    });
    
    return ffmpeg;
}

export async function loadFFmpeg(ffmpeg: FFmpegType, signal: AbortSignal) {
    if (!ffmpeg.isLoaded()) {
        await ffmpeg.load({ signal });
        return ffmpeg;
    }
}