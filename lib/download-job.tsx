import axios, { AxiosError } from 'axios'
import saveAs from 'file-saver'
import { applyMetadata, codecMap, FFmpegType, fixMD5Hash, loadFFmpeg } from './ffmpeg-functions'
import { artistReleaseCategories } from '@/components/artist-dialog'
import { cleanFileName, cleanFolderPath, formatBytes, formatCustomTitle, resizeImage } from './utils'
import { createJob } from './status-bar/jobs'
import { Disc3Icon, DiscAlbumIcon } from 'lucide-react'
import {
  FetchedQobuzAlbum,
  formatTitle,
  getFullResImageUrl,
  QobuzAlbum,
  QobuzArtistResults,
  QobuzTrack
} from './qobuz-dl'
import { SettingsProps } from './settings-provider'
import { StatusBarProps } from '@/components/status-bar/status-bar'
import { ToastAction } from '@/components/ui/toast'
import { zipSync } from 'fflate'

// Helper function to check if server downloads are globally enabled
const isServerDownloadsEnabled = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/server-config')
    if (response.ok) {
      const serverConfig = await response.json()
      return serverConfig.success && serverConfig.data.enableServerDownloads
    }
  } catch (error) {
    console.warn('Failed to fetch server config:', error)
  }
  return false
}

export const createDownloadJob = async (
  result: QobuzAlbum | QobuzTrack,
  setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>,
  ffmpegState: FFmpegType,
  settings: SettingsProps,
  toast: (toast: any) => void,
  fetchedAlbumData?: FetchedQobuzAlbum | null,
  setFetchedAlbumData?: React.Dispatch<React.SetStateAction<FetchedQobuzAlbum | null>>
) => {
  if ((result as QobuzTrack).album) {
    const formattedTitle = formatCustomTitle(settings.trackName, result as QobuzTrack)
    await createJob(setStatusBar, formattedTitle, Disc3Icon, async () => {
      return new Promise(async (resolve) => {
        try {
          const controller = new AbortController()
          const signal = controller.signal
          let cancelled = false
          setStatusBar((prev) => ({
            ...prev,
            progress: 0,
            title: `Downloading ${formatTitle(result)}`,
            description: `Loading FFmpeg`,
            onCancel: () => {
              cancelled = true
              controller.abort()
            }
          }))
          if (
            settings.applyMetadata ||
            !(
              (settings.outputQuality === '27' && settings.outputCodec === 'FLAC') ||
              (settings.bitrate === 320 && settings.outputCodec === 'MP3')
            )
          )
            await loadFFmpeg(ffmpegState, signal)
          setStatusBar((prev) => ({ ...prev, description: 'Fetching track size...' }))
          const APIResponse = await axios.get('/api/download-music', {
            params: { track_id: (result as QobuzTrack).id, quality: settings.outputQuality },
            signal
          })
          const trackURL = APIResponse.data.data.url
          const fileSizeResponse = await axios.head(trackURL, { signal })
          const fileSize = fileSizeResponse.headers['content-length']
          const response = await axios.get(trackURL, {
            responseType: 'arraybuffer',
            onDownloadProgress: (progressEvent) => {
              setStatusBar((statusbar) => {
                if (statusbar.processing && !cancelled)
                  return {
                    ...statusbar,
                    progress: Math.floor((progressEvent.loaded / fileSize) * 100),
                    description: `${formatBytes(progressEvent.loaded)} / ${formatBytes(fileSize)}`
                  }
                else return statusbar
              })
            },
            signal
          })
          setStatusBar((prev) => ({ ...prev, description: `Applying metadata...`, progress: 100 }))
          const inputFile = response.data
          let outputFile = await applyMetadata(inputFile, result as QobuzTrack, ffmpegState, settings, setStatusBar)
          if (settings.outputCodec === 'FLAC' && settings.fixMD5)
            outputFile = await fixMD5Hash(outputFile, setStatusBar)
          const objectURL = URL.createObjectURL(new Blob([outputFile]))
          const title = formattedTitle + '.' + codecMap[settings.outputCodec].extension
          const audioElement = document.createElement('audio')
          audioElement.id = `track_${result.id}`
          audioElement.src = objectURL
          audioElement.onloadedmetadata = async function () {
            if (audioElement.duration >= result.duration) {
              await proceedDownload(objectURL, title, settings, toast)
              resolve()
            } else {
              toast({
                title: 'Error',
                description: `Qobuz provided a file shorter than expected for "${title}". This can indicate the file being a sample track rather than the full track`,
                duration: Infinity,
                action: (
                  <ToastAction
                    altText='Copy Stack'
                    onClick={async () => {
                      await proceedDownload(objectURL, title, settings, toast)
                    }}
                  >
                    Download anyway
                  </ToastAction>
                )
              })
              resolve()
            }
          }
          document.body.append(audioElement)
        } catch (e) {
          if (e instanceof AxiosError && e.code === 'ERR_CANCELED') resolve()
          else {
            toast({
              title: 'Error',
              description: e instanceof Error ? e.message : 'An unknown error occurred',
              action: (
                <ToastAction altText='Copy Stack' onClick={() => navigator.clipboard.writeText((e as Error).stack!)}>
                  Copy Stack
                </ToastAction>
              )
            })
            resolve()
          }
        }
      })
    })
  } else {
    // Check if server downloads are globally enabled before using user preference
    const serverDownloadsEnabled = await isServerDownloadsEnabled()
    const shouldUseServerDownloads = serverDownloadsEnabled && settings.serverSideDownloads
    
    // For server downloads, use folderName instead of zipName since we're creating folders, not zips
    const folderSetting = shouldUseServerDownloads ? settings.folderName : settings.zipName
    console.log('Album download - serverDownloadsEnabled:', serverDownloadsEnabled, 'userPreference:', settings.serverSideDownloads, 'shouldUse:', shouldUseServerDownloads)
    console.log('Album download - using setting:', folderSetting)
    const formattedZipTitle = formatCustomTitle(folderSetting, result as QobuzAlbum)
    console.log('Album download - formattedZipTitle:', formattedZipTitle)

    await createJob(setStatusBar, formattedZipTitle, DiscAlbumIcon, async () => {
      return new Promise(async (resolve) => {
        try {
          const controller = new AbortController()
          const signal = controller.signal
          let cancelled = false
          setStatusBar((prev) => ({
            ...prev,
            progress: 0,
            title: `Downloading ${formatTitle(result)}`,
            description: `Loading FFmpeg...`,
            onCancel: () => {
              cancelled = true
              controller.abort()
            }
          }))
          if (
            settings.applyMetadata ||
            !(
              (settings.outputQuality === '27' && settings.outputCodec === 'FLAC') ||
              (settings.bitrate === 320 && settings.outputCodec === 'MP3')
            )
          )
            await loadFFmpeg(ffmpegState, signal)
          setStatusBar((prev) => ({ ...prev, description: 'Fetching album data...' }))
          if (!fetchedAlbumData) {
            const albumDataResponse = await axios.get('/api/get-album', {
              params: { album_id: (result as QobuzAlbum).id },
              signal
            })
            if (setFetchedAlbumData) {
              setFetchedAlbumData(albumDataResponse.data.data)
            }
            fetchedAlbumData = albumDataResponse.data.data
          }
          const albumTracks = fetchedAlbumData!.tracks.items.map((track: QobuzTrack) => ({
            ...track,
            album: fetchedAlbumData
          })) as QobuzTrack[]
          let totalAlbumSize = 0
          const albumUrls = [] as string[]
          setStatusBar((prev) => ({ ...prev, description: 'Fetching album size...' }))
          let currentDisk = 1
          let trackOffset = 0
          for (const [index, track] of albumTracks.entries()) {
            if (track.streamable) {
              const fileURLResponse = await axios.get('/api/download-music', {
                params: { track_id: track.id, quality: settings.outputQuality },
                signal
              })
              const trackURL = fileURLResponse.data.data.url
              if (!(currentDisk === track.media_number)) {
                trackOffset = albumUrls.length
                currentDisk = track.media_number
                albumUrls.push(trackURL)
              } else albumUrls[track.track_number + trackOffset - 1] = trackURL
              const fileSizeResponse = await axios.head(trackURL, { signal })
              setStatusBar((statusBar) => ({ ...statusBar, progress: (100 / albumTracks.length) * (index + 1) }))
              const fileSize = parseInt(fileSizeResponse.headers['content-length'])
              totalAlbumSize += fileSize
            }
          }
          const trackBuffers = [] as ArrayBuffer[]
          let totalBytesDownloaded = 0
          setStatusBar((statusBar) => ({ ...statusBar, progress: 0, description: `Fetching album art...` }))
          const albumArtURL = await resizeImage(
            getFullResImageUrl(fetchedAlbumData!),
            settings.albumArtSize,
            settings.albumArtQuality
          )
          const albumArt = albumArtURL ? (await axios.get(albumArtURL, { responseType: 'arraybuffer' })).data : false
          for (const [index, url] of albumUrls.entries()) {
            if (url) {
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
                        }
                      else return statusBar
                    })
                },
                signal
              })
              await new Promise((resolve) => setTimeout(resolve, 100))
              totalBytesDownloaded += response.data.byteLength
              const inputFile = response.data
              let outputFile = await applyMetadata(
                inputFile,
                albumTracks[index],
                ffmpegState,
                settings,
                undefined,
                albumArt,
                fetchedAlbumData!.upc
              )
              if (settings.outputCodec === 'FLAC' && settings.fixMD5)
                outputFile = await (await fixMD5Hash(outputFile)).arrayBuffer()
              trackBuffers[index] = outputFile
            }
          }
          setStatusBar((statusBar) => ({ ...statusBar, progress: 0, description: `Zipping album...` }))
          await new Promise((resolve) => setTimeout(resolve, 500))
          const zipFiles = {
            'cover.jpg': new Uint8Array(albumArt),
            ...trackBuffers.reduce(
              (acc, buffer, index) => {
                if (buffer) {
                  const fileName = `${(index + 1).toString().padStart(Math.max(String(albumTracks.length - 1).length, 2), '0')} ${formatCustomTitle(settings.trackName, albumTracks[index])}.${codecMap[settings.outputCodec].extension}`

                  acc[cleanFileName(fileName)] = new Uint8Array(buffer)
                }
                return acc
              },
              {} as { [key: string]: Uint8Array }
            )
          } as { [key: string]: Uint8Array }
          if (albumArt === false) delete zipFiles['cover.jpg']
          if (shouldUseServerDownloads) {
            // Save individual files to server instead of ZIP
            setStatusBar((prev) => ({ ...prev, description: 'Saving files to server...', progress: 90 }))
            
            let savedCount = 0
            const totalFiles = Object.keys(zipFiles).length
            
            for (const [filename, fileData] of Object.entries(zipFiles)) {
              try {
                const blob = new Blob([fileData])
                const formData = new FormData()
                formData.append('file', blob, filename)
                formData.append('filename', filename)
                formData.append('output_path', `${settings.serverDownloadPath || 'downloads'}/${cleanFolderPath(formattedZipTitle)}`)
                
                const saveResponse = await fetch('/api/save-to-server', {
                  method: 'POST',
                  body: formData
                })
                
                if (saveResponse.ok) {
                  savedCount++
                  setStatusBar((prev) => ({ 
                    ...prev, 
                    progress: 90 + Math.floor((savedCount / totalFiles) * 10)
                  }))
                } else {
                  console.error(`Failed to save ${filename} to server:`, await saveResponse.text())
                }
              } catch (error) {
                console.error(`Error saving ${filename} to server:`, error)
              }
            }
            
            setStatusBar((prev) => ({ ...prev, progress: 100 }))
            // Show success toast for album server download
            toast({
              title: 'Album Download Complete',
              description: `Successfully saved "${formattedZipTitle}" to server (${savedCount}/${totalFiles} files)`
            })
          } else {
            // Original ZIP download behavior
            const zippedFile = zipSync(zipFiles, { level: 0 })
            const zipBlob = new Blob([zippedFile as BlobPart], { type: 'application/zip' })
            setStatusBar((prev) => ({ ...prev, progress: 100 }))
            const objectURL = URL.createObjectURL(zipBlob)
            saveAs(objectURL, formattedZipTitle + '.zip')
            setTimeout(() => {
              URL.revokeObjectURL(objectURL)
            }, 100)
          }
          resolve()
        } catch (e) {
          if (e instanceof AxiosError && e.code === 'ERR_CANCELED') resolve()
          else {
            toast({
              title: 'Error',
              description: e instanceof Error ? e.message : 'An unknown error occurred',
              action: (
                <ToastAction altText='Copy Stack' onClick={() => navigator.clipboard.writeText((e as Error).stack!)}>
                  Copy Stack
                </ToastAction>
              )
            })
            resolve()
          }
        }
      })
    })
  }
}

async function proceedDownload(objectURL: string, title: string, settings?: SettingsProps, toast?: (toast: any) => void) {
  // Check if server downloads are globally enabled before using user preference
  const serverDownloadsEnabled = await isServerDownloadsEnabled()
  const shouldUseServerDownloads = serverDownloadsEnabled && settings?.serverSideDownloads
  
  if (shouldUseServerDownloads) {
    // Save to server instead of browser download
    try {
      const response = await fetch(objectURL)
      const blob = await response.blob()
      
      const formData = new FormData()
      formData.append('file', blob, title)
      formData.append('filename', title)
      formData.append('output_path', settings.serverDownloadPath || 'downloads')
      
      const saveResponse = await fetch('/api/save-to-server', {
        method: 'POST',
        body: formData
      })
      
      if (saveResponse.ok) {
        console.log('File saved to server:', title)
        toast?.({
          title: 'Download Complete',
          description: `Successfully saved "${title}" to server`
        })
      } else {
        console.error('Failed to save to server:', await saveResponse.text())
        toast?.({
          title: 'Server Save Failed',
          description: `Failed to save "${title}" to server`
        })
      }
    } catch (error) {
      console.error('Error saving to server:', error)
    }
  } else {
    // Original browser download behavior
    saveAs(objectURL, title)
  }
  
  setTimeout(() => {
    URL.revokeObjectURL(objectURL)
  }, 100)
}

export async function downloadArtistDiscography(
  artistResults: QobuzArtistResults,
  setArtistResults: React.Dispatch<React.SetStateAction<QobuzArtistResults | null>>,
  fetchMore: (searchField: any, artistResults: QobuzArtistResults) => Promise<void>,
  type: 'album' | 'epSingle' | 'live' | 'compilation' | 'all',
  setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>,
  settings: SettingsProps,
  toast: (toast: any) => void,
  ffmpegState: FFmpegType
) {
  let types: ('album' | 'epSingle' | 'live' | 'compilation')[] = []
  if (type === 'all') types = ['album', 'epSingle', 'live', 'compilation']
  else types = [type]
  for (const type of types) {
    while (artistResults.artist.releases[type].has_more) {
      await fetchMore(type, artistResults)
      artistResults = (await loadArtistResults(setArtistResults)) as QobuzArtistResults
    }
    for (const release of artistResults.artist.releases[type].items) {
      await createDownloadJob(release, setStatusBar, ffmpegState, settings, toast)
    }
  }
  toast({
    title: `Added all ${artistReleaseCategories.find((category) => category.value === type)?.label ?? 'releases'} by '${artistResults.artist.name.display}'`,
    description: 'All releases have been added to the queue'
  })
}

export async function loadArtistResults(
  setArtistResults: React.Dispatch<React.SetStateAction<QobuzArtistResults | null>>
): Promise<QobuzArtistResults | null> {
  return new Promise((resolve) => {
    setArtistResults((prev: QobuzArtistResults | null) => (resolve(prev), prev))
  })
}
