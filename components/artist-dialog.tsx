import axios from 'axios';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import ReleaseCard from './release-card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { Disc3Icon, DiscAlbumIcon, DownloadIcon, LucideIcon, RadioTowerIcon, UsersIcon } from 'lucide-react';
import { downloadArtistDiscography } from '@/lib/download-job';
import { motion } from 'motion/react';
import { parseArtistAlbumData, parseArtistData, QobuzArtist, QobuzArtistResults } from '@/lib/qobuz-dl';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { useFFmpeg } from '@/lib/ffmpeg-provider';
import { useInView } from 'react-intersection-observer';
import { useSettings } from '@/lib/settings-provider';
import { useStatusBar } from '@/lib/status-bar/context';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import { useCountry } from '@/lib/country-provider';

export type CategoryType = {
    label: string;
    value: 'album' | 'epSingle' | 'live' | 'compilation';
    icon: LucideIcon;
};

export const artistReleaseCategories: CategoryType[] = [
    {
        label: 'albums',
        value: 'album',
        icon: DiscAlbumIcon
    },
    {
        label: 'EPs & singles',
        value: 'epSingle',
        icon: Disc3Icon
    },
    {
        label: 'live albums',
        value: 'live',
        icon: RadioTowerIcon
    },
    {
        label: 'compilations',
        value: 'compilation',
        icon: DiscAlbumIcon
    }
];

const ArtistDialog = ({ open, setOpen, artist }: { open: boolean; setOpen: (open: boolean) => void; artist: QobuzArtist }) => {
    const [artistResults, setArtistResults] = useState<QobuzArtistResults | null>(null);
    const [, setSearching] = useState(false);
    const { country } = useCountry();

    const getArtistData = async () => {
        if (artistResults) return;
        try {
            const response = await axios.get(`/api/get-artist`, { params: { artist_id: artist.id }, headers: { 'Token-Country': country } });
            setArtistResults(parseArtistData(response.data.data));
        } catch {
            toast({ title: 'Error', description: 'Could not fetch artist data, check your token' });
        }
    };

    const fetchMore = async (searchField: 'album' | 'epSingle' | 'live' | 'compilation', artistResults: QobuzArtistResults) => {
        setSearching(true);
        const response = await axios.get(`/api/get-releases`, {
            params: {
                artist_id: artist.id,
                offset: artistResults!.artist.releases[searchField]!.items.length,
                limit: 10,
                release_type: searchField
            },
            headers: { 'Token-Country': country }
        });
        const newReleases = [
            ...artistResults!.artist.releases[searchField].items,
            ...response.data.data.items.map((release: any) => parseArtistAlbumData(release))
        ];
        setArtistResults({
            ...artistResults!,
            artist: {
                ...artistResults!.artist,
                releases: {
                    ...artistResults!.artist.releases,
                    [searchField]: {
                        ...artistResults!.artist.releases[searchField],
                        items: newReleases,
                        has_more: response.data.data.has_more
                    }
                }
            }
        });
        setSearching(false);
    };

    useEffect(() => {
        if (open) getArtistData();
    }, [open]);

    const { setStatusBar } = useStatusBar();
    const { toast } = useToast();
    const { settings } = useSettings();
    const { ffmpegState } = useFFmpeg();
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className='w-[1000px] max-w-[90%] md:max-w-[80%] overflow-hidden'>
                <div className='flex gap-3 overflow-hidden'>
                    <div className='relative shrink-0 aspect-square min-w-[100px] min-h-[100px] rounded-sm overflow-hidden'>
                        {(artist.image?.small || artistResults?.artist.images.portrait) && <Skeleton className='absolute aspect-square w-full h-full' />}
                        {artist.image?.small || artistResults?.artist.images.portrait ? (
                            <Image
                                fill
                                src={
                                    artist.image?.small ||
                                    'https://static.qobuz.com/images/artists/covers/medium/' +
                                        artistResults?.artist.images.portrait.hash +
                                        '.' +
                                        artistResults?.artist.images.portrait.format
                                }
                                alt={artist.name}
                                className='text-[0px] absolute aspect-square w-full h-full object-cover'
                            />
                        ) : (
                            <div className='w-full h-full bg-secondary flex items-center justify-center p-6'>
                                <UsersIcon className='w-full h-full opacity-20' />
                            </div>
                        )}
                    </div>

                    <div className='flex w-full flex-col justify-between overflow-hidden'>
                        <div className='space-y-1.5 overflow-visible'>
                            <DialogTitle title={artist.name} className='truncate overflow-visible py-0.5 pr-2'>
                                {artist.name}
                            </DialogTitle>
                            {artist.albums_count && (
                                <DialogDescription
                                    title={artist.albums_count + ' ' + (artist.albums_count !== 1 ? 'releases' : 'release')}
                                    className='truncate overflow-visible '
                                >
                                    {artist.albums_count} {artist.albums_count > 1 ? 'releases' : 'release'}
                                </DialogDescription>
                            )}
                        </div>
                        <div className='flex items-center w-full justify-between gap-2'>
                            {artistResults && (
                                <Button
                                    size='icon'
                                    variant='ghost'
                                    onClick={() => {
                                        downloadArtistDiscography(
                                            artistResults,
                                            setArtistResults,
                                            fetchMore,
                                            'all',
                                            setStatusBar,
                                            settings,
                                            toast,
                                            ffmpegState,
                                            country
                                        );
                                    }}
                                >
                                    <DownloadIcon />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                <ScrollArea>
                    {artistResults && (
                        <motion.div initial={{ maxHeight: '0vh', opacity: 0 }} animate={{ maxHeight: '70vh', opacity: 1 }} transition={{ duration: 0.3 }}>
                            <div className='flex gap-4 flex-col'>
                                {artistReleaseCategories.map((category) => (
                                    <ArtistReleaseSection
                                        artist={artist}
                                        artistResults={artistResults}
                                        setArtistResults={setArtistResults}
                                        category={category}
                                        key={category.value}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                    <ScrollBar orientation='vertical' className='z-50' />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

const ArtistReleaseSection = ({
    artist,
    artistResults,
    setArtistResults,
    category
}: {
    artist: QobuzArtist;
    artistResults: QobuzArtistResults | null;
    setArtistResults: React.Dispatch<React.SetStateAction<QobuzArtistResults | null>>;
    category: CategoryType;
}) => {
    const { resolvedTheme } = useTheme();
    const [searching, setSearching] = useState(false);
    const [scrollTrigger, isInView] = useInView();
    const { country } = useCountry();

    const fetchMore = async (searchField: 'album' | 'epSingle' | 'live' | 'compilation', artistResults: QobuzArtistResults) => {
        setSearching(true);
        const response = await axios.get(`/api/get-releases`, {
            params: {
                artist_id: artist.id,
                offset: artistResults!.artist.releases[searchField]!.items.length,
                limit: 10,
                release_type: category.value
            },
            headers: { 'Token-Country': country }
        });
        const newReleases = [
            ...artistResults!.artist.releases[searchField].items,
            ...response.data.data.items.map((release: any) => parseArtistAlbumData(release))
        ];
        setArtistResults({
            ...artistResults!,
            artist: {
                ...artistResults!.artist,
                releases: {
                    ...artistResults!.artist.releases,
                    [searchField]: {
                        ...artistResults!.artist.releases[searchField],
                        items: newReleases,
                        has_more: response.data.data.has_more
                    }
                }
            }
        });
        setSearching(false);
    };

    useEffect(() => {
        if (isInView && !searching) fetchMore(category.value, artistResults!);
    }, [isInView]);

    const { setStatusBar } = useStatusBar();
    const { toast } = useToast();
    const { settings } = useSettings();
    const { ffmpegState } = useFFmpeg();
    return (
        <>
            {artistResults && artistResults.artist.releases[category.value] && artistResults.artist.releases[category.value]!.items.length > 0 && (
                <div className='flex flex-col'>
                    <div className='flex gap-2 items-center mb-2'>
                        <category.icon />
                        <h1 className='text-lg md:text-2xl font-bold capitalize'>{category.label}</h1>
                        <Button
                            variant='outline'
                            className='ml-2'
                            onClick={() => {
                                downloadArtistDiscography(
                                    artistResults,
                                    setArtistResults,
                                    fetchMore,
                                    category.value,
                                    setStatusBar,
                                    settings,
                                    toast,
                                    ffmpegState
                                );
                            }}
                        >
                            Download All
                            <DownloadIcon />
                        </Button>
                    </div>
                    <ScrollArea className='max-w-full overflow-x-clip'>
                        <div className='flex gap-2'>
                            {artistResults &&
                                artistResults.artist.releases[category.value]!.items.map((_, i) => (
                                    <div
                                        className='2xl:min-w-[8vw] 2xl:max-w-[8vw] lg:min-w-[15vw] lg:max-w-[15vw] md:min-w-[20vw] md:max-w-[20vw] sm:min-w-[25vw] sm:max-w-[25vw] xs:min-w-[30vw] xs:max-w-[30vw] min-w-[40vw] max-w-[40vw]'
                                        key={i}
                                    >
                                        <ReleaseCard
                                            result={artistResults.artist.releases[category.value]!.items[i]}
                                            resolvedTheme={String(resolvedTheme)}
                                            showArtistDialog={false}
                                        />
                                    </div>
                                ))}
                            <div className='flex h-full items-center gap-2 relative overflow-hidden 2xl:min-w-[25vw] 2xl:max-w-[25vw] lg:min-w-[37.5vw] lg:max-w-[37.5vw] md:min-w-[50vw] md:max-w-[50vw] sm:min-w-[62.5vw] sm:max-w-[62.5vw] xs:min-w-[75vw] xs:max-w-[75vw] min-w-[100vw] max-w-[100vw]'>
                                {artistResults?.artist.releases[category.value]!.has_more &&
                                    Array(5)
                                        .fill(0)
                                        .map((_, index) => {
                                            return (
                                                <div key={index} className='relative min-w-[40%]'>
                                                    <Skeleton
                                                        className='relative w-full aspect-square group select-none rounded-sm overflow-hidden'
                                                        ref={index === 0 ? scrollTrigger : null}
                                                    />
                                                    <div className='h-[40px]'></div>
                                                </div>
                                            );
                                        })}
                                <div className='absolute w-full bg-gradient-to-r from-transparent to-background/70 bottom-0 h-full'></div>
                            </div>
                        </div>
                        <ScrollBar orientation='horizontal' />
                        <div className='h-[10px]'></div>
                    </ScrollArea>
                </div>
            )}
        </>
    );
};

export default ArtistDialog;
