import React, { useEffect, useState } from 'react';
import { Button, ButtonProps } from './ui/button';
import { DownloadIcon, FileArchiveIcon, MusicIcon } from 'lucide-react';
import { StatusBarProps } from './status-bar/status-bar';
import { FFmpegType } from '@/lib/ffmpeg-functions';
import { SettingsProps } from '@/lib/settings-provider';
import { FetchedQobuzAlbum, formatTitle, getFullAlbumInfo, QobuzAlbum } from '@/lib/qobuz-dl';
import { createDownloadJob } from '@/lib/download-job';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useCountry } from '@/lib/country-provider';

export interface DownloadAlbumButtonProps extends ButtonProps {
    result: QobuzAlbum;
    setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>;
    ffmpegState: FFmpegType;
    settings: SettingsProps;
    fetchedAlbumData: FetchedQobuzAlbum | null;
    setFetchedAlbumData: React.Dispatch<React.SetStateAction<FetchedQobuzAlbum | null>>;
    onOpen?: () => void;
    onClose?: () => void;
    toast: (toast: any) => void;
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
                                    description: 'The album has been added to the queue'
                                });
                            }}
                            className='flex items-center gap-2'
                        >
                            <FileArchiveIcon className='!size-4' />
                            <p>ZIP Archive</p>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={async () => {
                                const albumData = await getFullAlbumInfo(fetchedAlbumData, setFetchedAlbumData, result, country);
                                for (const track of albumData.tracks.items) {
                                    if (track.streamable) {
                                        await createDownloadJob(
                                            { ...track, album: albumData },
                                            setStatusBar,
                                            ffmpegState,
                                            settings,
                                            toast,
                                            albumData,
                                            setFetchedAlbumData,
                                            country
                                        );
                                        await new Promise((resolve) => setTimeout(resolve, 100));
                                    }
                                }
                                toast({
                                    title: `Added '${formatTitle(result)}'`,
                                    description: 'The album has been added to the queue'
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
DownloadButton.displayName = 'DownloadAlbumButton';

export default DownloadButton;
