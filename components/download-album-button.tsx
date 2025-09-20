import React, { useEffect, useState } from 'react'
import { Button, ButtonProps } from './ui/button'
import { DownloadIcon, FileArchiveIcon, MusicIcon } from 'lucide-react'
import { StatusBarProps } from './status-bar/status-bar'
import { FFmpegType } from '@/lib/ffmpeg-functions'
import { SettingsProps, useSettings } from '@/lib/settings-provider'
import { FetchedQobuzAlbum, formatTitle, getFullAlbumInfo, QobuzAlbum } from '@/lib/qobuz-dl'
import { createDownloadJob } from '@/lib/download-job'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'

export interface DownloadAlbumButtonProps extends ButtonProps {
  result: QobuzAlbum
  setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>
  ffmpegState: FFmpegType
  settings: SettingsProps
  fetchedAlbumData: FetchedQobuzAlbum | null
  setFetchedAlbumData: React.Dispatch<React.SetStateAction<FetchedQobuzAlbum | null>>
  onOpen?: () => void
  onClose?: () => void
  toast: (toast: any) => void
}

const DownloadButton = React.forwardRef<HTMLButtonElement, DownloadAlbumButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      onOpen,
      onClose,
      result,
      setStatusBar,
      ffmpegState,
      settings,
      toast,
      fetchedAlbumData,
      setFetchedAlbumData,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = useState(false)
    const { enableServerDownloads } = useSettings()
    
    useEffect(() => {
      if (open) onOpen?.()
      else onClose?.()
    })
    // If server downloads are globally enabled AND user has enabled them, show simple button without dropdown
    console.log('DownloadButton - enableServerDownloads:', enableServerDownloads, 'settings.serverSideDownloads:', settings.serverSideDownloads)
    const shouldUseServerDownloads = enableServerDownloads && settings.serverSideDownloads
    if (shouldUseServerDownloads) {
      console.log('DownloadButton - Using server download path!')
      return (
        <Button 
          className={className} 
          ref={ref} 
          variant={variant} 
          size={size} 
          asChild={asChild} 
          onClick={() => {
            console.log('DownloadButton - Server download clicked, settings:', settings)
            createDownloadJob(
              result,
              setStatusBar,
              ffmpegState,
              settings,
              toast,
              fetchedAlbumData,
              setFetchedAlbumData
            )
            toast({ title: `Added '${formatTitle(result)}'`, description: 'The album has been added to the server download queue' })
          }}
          {...props}
        >
          <DownloadIcon className='!size-4' />
        </Button>
      )
    }

    console.log('DownloadButton - Using client download path (dropdown). Server downloads globally enabled:', enableServerDownloads, 'but user preference is:', settings.serverSideDownloads)
    return (
      <>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button className={className} ref={ref} variant={variant} size={size} asChild={asChild} {...props}>
              <DownloadIcon className='!size-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => {
                createDownloadJob(
                  result,
                  setStatusBar,
                  ffmpegState,
                  settings,
                  toast,
                  fetchedAlbumData,
                  setFetchedAlbumData
                )
                toast({ title: `Added '${formatTitle(result)}'`, description: 'The album has been added to the queue' })
              }}
              className='flex items-center gap-2'
            >
              <FileArchiveIcon className='!size-4' />
              <p>ZIP Archive</p>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                const albumData = await getFullAlbumInfo(fetchedAlbumData, setFetchedAlbumData, result)
                for (const track of albumData.tracks.items) {
                  if (track.streamable) {
                    await createDownloadJob(
                      { ...track, album: albumData },
                      setStatusBar,
                      ffmpegState,
                      settings,
                      toast,
                      albumData,
                      setFetchedAlbumData
                    )
                    await new Promise((resolve) => setTimeout(resolve, 100))
                  }
                }
                toast({ title: `Added '${formatTitle(result)}'`, description: 'The album has been added to the queue' })
              }}
              className='flex items-center gap-2'
            >
              <MusicIcon className='!size-4' />
              <p>No ZIP Archive</p>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    )
  }
)
DownloadButton.displayName = 'DownloadAlbumButton'

export default DownloadButton
