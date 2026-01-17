'use client';

import axios from 'axios';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReleaseCard from '@/components/release-card';
import SearchBar from '@/components/search-bar/search-bar';
import { Button } from '@/components/ui/button';
import { Disc3Icon, DiscAlbumIcon, UsersIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FilterDataType, filterExplicit, QobuzAlbum, QobuzArtist, QobuzSearchFilters, QobuzSearchResults, QobuzTrack } from '@/lib/qobuz-dl';
import { getTailwindBreakpoint } from '@/lib/utils';
import { motion, useAnimation } from 'motion/react';
import { Skeleton } from '@/components/ui/skeleton';
import { useInView } from 'react-intersection-observer';
import { useSettings } from '@/lib/settings-provider';
import { useTheme } from 'next-themes';
import CountryPicker from '@/components/country-picker';
import { useCountry } from '@/lib/country-provider';

export const filterData: FilterDataType = [
    {
        label: 'Albums',
        value: 'albums',
        icon: DiscAlbumIcon
    },
    {
        label: 'Tracks',
        value: 'tracks',
        icon: Disc3Icon
    },
    {
        label: 'Artists',
        value: 'artists',
        icon: UsersIcon
    }
];

const SearchView = () => {
    const { resolvedTheme } = useTheme();
    const [results, setResults] = useState<QobuzSearchResults | null>(null);
    const [searchField, setSearchField] = useState<QobuzSearchFilters>('albums');
    const [query, setQuery] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [searching, setSearching] = useState<boolean>(false);
    const [searchError, setSearchError] = useState<string>('');
    const { settings } = useSettings();
    const { country } = useCountry();

    useEffect(() => {
        console.log(`%c${process.env.NEXT_PUBLIC_APPLICATION_NAME}`, 'font-size: 25px; font-weight: bold;');
        if (process.env.NEXT_PUBLIC_DISCORD) {
            console.log(`Discord: ${process.env.NEXT_PUBLIC_DISCORD}`);
        }
        if (process.env.NEXT_PUBLIC_GITHUB) {
            console.log(`GitHub: ${process.env.NEXT_PUBLIC_GITHUB}`);
        }
    }, []);

    const FilterIcon = filterData.find((fd) => fd.value == searchField)?.icon || Disc3Icon;

    const [scrollTrigger, isInView] = useInView();

    const fetchMore = () => {
        if (loading) return;
        setLoading(true);
        const filter = filterData.find((fd) => fd.value == searchField) || filterData[0];
        if (filter.searchRoute) {
            axios
                .get('/api/' + filter.searchRoute + `?q=${query}&offset=${results![searchField].items.length}`, { headers: { 'Token-Country': country } })
                .then((response) => {
                    if (response.status === 200) {
                        response.data.data[searchField].items.length = Math.max(
                            response.data.data[searchField].items.length,
                            Math.min(response.data.data[searchField].limit, response.data.data[searchField].total - response.data.data[searchField].offset)
                        );
                        response.data.data[searchField].items.fill(null, response.data.data[searchField].items.length);
                        const newResults = {
                            ...results!,
                            [searchField]: {
                                ...results![searchField],
                                items: [...results![searchField].items, ...response.data.data[searchField].items]
                            }
                        };
                        setLoading(false);
                        if (query === response.data.data.query) setResults(newResults);
                    }
                });
        } else {
            axios.get(`/api/get-music?q=${query}&offset=${results![searchField].items.length}`, { headers: { 'Token-Country': country } }).then((response) => {
                if (response.status === 200) {
                    let newResults = {
                        ...results!,
                        [searchField]: {
                            ...results!.albums,
                            items: [...results!.albums.items, ...response.data.data.albums.items]
                        }
                    };
                    filterData.map((filter) => {
                        response.data.data[filter.value].items.length = Math.max(
                            response.data.data[filter.value].items.length,
                            Math.min(response.data.data[filter.value].limit, response.data.data[filter.value].total - response.data.data[filter.value].offset)
                        );
                        response.data.data[filter.value].items.fill(null, response.data.data[filter.value].items.length);
                        newResults = {
                            ...newResults,
                            [filter.value]: {
                                ...results![filter.value as QobuzSearchFilters],
                                items: [...results![filter.value as QobuzSearchFilters].items, ...response.data.data[filter.value].items]
                            }
                        };
                    });
                    setLoading(false);
                    if (query === response.data.data.query) setResults(newResults);
                }
            });
        }
    };

    useEffect(() => {
        if (searching) return;
        if (isInView && results![searchField].total > results![searchField].items.length && !loading) fetchMore();
        if (results?.switchTo) {
            setSearchField(results.switchTo);
        }
    }, [isInView, results]);

    const cardRef = useRef<HTMLDivElement | null>(null);
    const [cardHeight, setCardHeight] = useState<number>(0);

    useEffect(() => {
        const element = cardRef.current;

        if (!element) {
            return;
        }

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === element) {
                    setCardHeight(entry.contentRect.height);
                }
            }
        });

        resizeObserver.observe(element);

        return () => {
            resizeObserver.disconnect();
        };
    }, [results, settings.explicitContent, searchField]);

    useLayoutEffect(() => {
        const handleResize = () => {
            if (typeof window !== 'undefined') {
                setNumRows(rowsMap[getTailwindBreakpoint(window.innerWidth)]);
            }
        };

        handleResize();

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const rowsMap = {
        sm: 3,
        md: 5,
        lg: 6,
        xl: 7,
        '2xl': 7,
        base: 2
    };

    const [numRows, setNumRows] = useState(0);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [logoSrc, setLogoSrc] = useState<string | null>(null);

    useEffect(() => {
        if (logoSrc) URL.revokeObjectURL(logoSrc);
        if (mounted) {
            (async () => {
                const logoSrc = await axios.get(resolvedTheme === 'light' ? '/logo/qobuz-web-light.png' : '/logo/qobuz-web-dark.png', { responseType: 'blob' });
                setLogoSrc(URL.createObjectURL(logoSrc.data));
            })();
        }
    }, [mounted, resolvedTheme]);

    const logoAnimationControls = useAnimation();
    useEffect(() => {
        if (mounted && logoSrc)
            setTimeout(
                () =>
                    logoAnimationControls.start({
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.5, type: 'spring' }
                    }),
                100
            );
    }, [logoAnimationControls, mounted, logoSrc]);

    const onSearch = async (query: string, searchFieldInput: string = searchField) => {
        setQuery(query);
        setSearchError('');
        const filter = filterData.find((filter) => filter.value === searchFieldInput) || filterData[0];
        try {
            const response = await axios.get(`/api/${filter.searchRoute ? filter.searchRoute : 'get-music'}?q=${query}&offset=0`, {
                headers: {
                    'Token-Country': country
                }
            });
            if (response.status === 200) {
                setLoading(false);
                if (searchField !== searchFieldInput) setSearchField(searchFieldInput as QobuzSearchFilters);

                let newResults = { ...response.data.data };
                filterData.map((filter) => {
                    if (!newResults[filter.value])
                        newResults = {
                            ...newResults,
                            [filter.value]: {
                                total: undefined,
                                offset: undefined,
                                limit: undefined,
                                items: []
                            }
                        };
                });
                setResults(newResults);
            }
        } catch (error: any) {
            setSearchError(error?.response.data?.error || error.message || 'An error occurred.');
        }
        setSearching(false);
    };

    useEffect(() => {
        if (country && query) onSearch(query);
    }, [country]);

    return (
        <>
            <div className='space-y-4'>
                <motion.div
                    className='flex flex-col select-none cursor-pointer'
                    onClick={() => {
                        logoAnimationControls.start({
                            scale: [1, 1.1, 1],
                            transition: { duration: 0.4, ease: 'easeInOut' }
                        });
                        setQuery('');
                        setResults(null);
                        setSearchField('albums');
                    }}
                    initial={{ opacity: 0, y: -25 }}
                    animate={logoAnimationControls}
                    transition={{ duration: 0.5 }}
                >
                    {process.env.NEXT_PUBLIC_APPLICATION_NAME!.toLowerCase() === 'qobuz-dl' ? (
                        <>
                            {mounted && logoSrc ? (
                                <img src={logoSrc} alt={process.env.NEXT_PUBLIC_APPLICATION_NAME!} className='w-auto h-[100px] mx-auto z-[5]' />
                            ) : (
                                <div className='min-h-[100px] min-w-[10px]' />
                            )}
                        </>
                    ) : (
                        <>
                            <h1 className='text-4xl font-bold text-center'>{process.env.NEXT_PUBLIC_APPLICATION_NAME}</h1>
                            <p className='text-md text-center font-medium text-muted-foreground'>The simplest music downloader</p>
                        </>
                    )}
                </motion.div>
                <div className='flex flex-col items-start justify-center'>
                    <SearchBar onSearch={onSearch} searching={searching} setSearching={setSearching} query={query} />

                    <div className='w-full flex items-center justify-between'>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant='outline'
                                    className='my-2 flex gap-2 focus-visible:outline-none focus-visible:ring-transparent select-none shadow-none outline-none !z-[99]'
                                >
                                    <FilterIcon />
                                    <span className='capitalize'>{searchField}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuRadioGroup value={searchField} onValueChange={setSearchField as React.Dispatch<React.SetStateAction<string>>}>
                                    {filterData.map((type, index) => (
                                        <DropdownMenuRadioItem key={index} value={type.value}>
                                            {type.label}
                                        </DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <CountryPicker className='sm:hidden' />
                    </div>
                    {searchError && (
                        <p className='text-destructive w-full text-center font-semibold'>
                            {typeof searchError === 'object' ? JSON.stringify(searchError) : searchError}
                        </p>
                    )}
                </div>
            </div>

            <div>
                {results && (
                    <div className='my-6 w-screen mx-auto max-w-[1600px] pb-20'>
                        <div
                            className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 w-full px-6 overflow-visible'
                            style={{
                                maxHeight: `${(Math.ceil(filterExplicit(results, settings.explicitContent)[searchField].items.length / numRows) + 2) * (cardHeight + 16)}px`
                            }}
                        >
                            {filterExplicit(results, settings.explicitContent)[searchField].items.map(
                                (result: QobuzAlbum | QobuzTrack | QobuzArtist, index: number) => {
                                    if (!result) return null;
                                    return (
                                        <ReleaseCard
                                            key={`${index}-${result.id}-${searchField}`}
                                            result={result}
                                            resolvedTheme={String(resolvedTheme)}
                                            ref={index === 0 ? cardRef : null}
                                        />
                                    );
                                }
                            )}
                            {results![searchField].items.length < results![searchField].total &&
                                [
                                    ...Array(
                                        results![searchField].total > results![searchField].items.length + 30
                                            ? 30
                                            : results![searchField].total - results![searchField].items.length
                                    )
                                ].map((_, index) => {
                                    return (
                                        <div key={index} className='relative w-full'>
                                            <Skeleton
                                                className='relative w-full aspect-square group select-none rounded-sm overflow-hidden'
                                                ref={index === 0 ? scrollTrigger : null}
                                            />
                                            <div className='h-[40px]'></div>
                                        </div>
                                    );
                                })}
                        </div>
                        {results![searchField].items.length >= results![searchField].total && (
                            <div className='w-full h-[40px] text-lg flex items-center justify-center font-semibold pt-8'>No more {searchField} to show.</div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default SearchView;
