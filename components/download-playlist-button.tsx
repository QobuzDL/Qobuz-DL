import React, { useEffect, useState } from 'react';
import { Button, ButtonProps } from './ui/button';
import { DownloadIcon, FileArchiveIcon, MusicIcon } from 'lucide-react';
import { StatusBarProps } from './status-bar/status-bar';
import { FFmpegType } from '@/lib/ffmpeg-functions';
import { SettingsProps } from '@/lib/settings-provider';
import { FetchedQobuzAlbum, formatTitle, QobuzPlaylist } from '@/lib/qobuz-dl';
import { createDownloadJob } from '@/lib/download-job';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useCountry } from '@/lib/country-provider';

export interface DownloadPlaylistButtonProps extends ButtonProps {
    result: QobuzPlaylist;
    setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>;
    ffmpegState: FFmpegType;
    settings: SettingsProps;
    fetchedAlbumData: FetchedQobuzAlbum | null;
    setFetchedAlbumData: React.Dispatch<React.SetStateAction<FetchedQobuzAlbum | null>>;
    fetchedPlaylistData?: QobuzPlaylist | null;
    onOpen?: () => void;
    onClose?: () => void;
    toast: (toast: any) => void;
}

const DownloadPlaylistButton = React.forwardRef<HTMLButtonElement, DownloadPlaylistButtonProps>(
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
            fetchedPlaylistData,
            ...props
        },
        ref
    ) => {
        const { country } = useCountry();
        const [open, setOpen] = useState(false);
        useEffect(() => {
            if (open) onOpen?.();
            else onClose?.();
        });
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
                                createDownloadJob(result, setStatusBar, ffmpegState, settings, toast, fetchedAlbumData, setFetchedAlbumData, country);
                                toast({
                                    title: `Added '${formatTitle(result)}'`,
                                    description: 'The playlist has been added to the queue'
                                });
                            }}
                            className='flex items-center gap-2'
                        >
                            <FileArchiveIcon className='!size-4' />
                            <p>ZIP Archive</p>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={async () => {
                                const playlist = fetchedPlaylistData || result;
                                if (!playlist.tracks || !playlist.tracks.items) {
                                    toast({
                                        title: 'Error',
                                        description: 'Please open the tracklist first to load playlist data'
                                    });
                                    return;
                                }
                                for (const track of playlist.tracks.items) {
                                    if (track.streamable) {
                                        await createDownloadJob(
                                            track,
                                            setStatusBar,
                                            ffmpegState,
                                            settings,
                                            toast,
                                            fetchedAlbumData,
                                            setFetchedAlbumData,
                                            country
                                        );
                                        await new Promise((resolve) => setTimeout(resolve, 100));
                                    }
                                }
                                toast({
                                    title: `Added '${formatTitle(result)}'`,
                                    description: 'The playlist has been added to the queue'
                                });
                            }}
                            className='flex items-center gap-2'
                        >
                            <MusicIcon className='!size-4' />
                            <p>No ZIP Archive</p>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </>
        );
    }
);
DownloadPlaylistButton.displayName = 'DownloadPlaylistButton';

export default DownloadPlaylistButton;
