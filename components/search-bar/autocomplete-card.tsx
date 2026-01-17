import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { getAlbum, QobuzAlbum, QobuzSearchResults, QobuzTrack } from '@/lib/qobuz-dl';

const AutocompleteCard = ({
    showCard,
    searchInput,
    searching,
    setSearching,
    results,
    loading,
    onSearch
}: {
    results: QobuzSearchResults | null;
    showCard: boolean;
    searchInput: string;
    searching: boolean;
    setSearching: React.Dispatch<React.SetStateAction<boolean>>;
    loading: boolean;
    onSearch: (query: string, searchFieldInput?: 'albums' | 'tracks') => void;
}) => {
    const limit = 5;
    return (
        <AnimatePresence>
            {showCard && searchInput.trim().length > 0 && !searching && results && searchInput.trim() === results.query.trim() && (
                <motion.div
                    initial={{ opacity: 0, translateY: -10, zIndex: 1000 }}
                    animate={{
                        opacity: 1,
                        translateY: 0,
                        transition: {
                            type: 'easeInOut',
                            stiffness: 150,
                            damping: 10,
                            duration: 0.5
                        }
                    }}
                    exit={{
                        opacity: 0,
                        translateY: -10,
                        transition: {
                            type: 'easeInOut',
                            stiffness: 150,
                            damping: 10,
                            duration: 0.4
                        }
                    }}
                    className='absolute top-0 left-0 right-0 mx-auto mt-0 w-full !z-[100]'
                >
                    <Card className='absolute top-12 left-0 right-0 mx-auto mt-0.5 w-full transition-all !z-[100]'>
                        <CardHeader>
                            <CardTitle className='text-base flex md:flex-row flex-col md:items-center md:gap-2 gap-0.5'>Quick Search</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <motion.div
                                initial='hidden'
                                animate='visible'
                                exit='hidden'
                                variants={{
                                    hidden: { opacity: 0 },
                                    visible: {
                                        opacity: 1,
                                        transition: {
                                            staggerChildren: 0.125
                                        }
                                    }
                                }}
                                className='flex flex-col gap-2 select-none overflow-hidden'
                            >
                                <div className='md:grid flex md:max-h-[unset] max-h-[100%] md:pr-0 pr-2 md:grid-cols-2 gap-6 overflow-hidden'>
                                    {['albums', 'tracks'].map((key, index) => (
                                        <motion.div
                                            key={index}
                                            variants={{
                                                hidden: { opacity: 0, y: 10 },
                                                visible: { opacity: 1, y: 0 }
                                            }}
                                            className='flex flex-col gap-1 w-[50%] md:w-full overflow-hidden h-full'
                                        >
                                            <div className='mb-1 capitalize flex items-center md:flex-row flex-col md:items-center md:gap-2 gap-0.5 w-full'>
                                                <p className='text-sm font-semibold capitalize'>{key}</p>
                                                <p className='text-xs font-semibold text-muted-foreground capitalize'>
                                                    Showing {results?.[key as 'albums' | 'tracks'].items.slice(0, limit).length} of
                                                    {results?.[key as 'albums' | 'tracks'].total}
                                                </p>
                                            </div>
                                            {results?.[key as 'albums' | 'tracks'].items.slice(0, limit).map((result: QobuzAlbum | QobuzTrack, index) => {
                                                const value = `${result.title} - ${getAlbum(result).artist.name}`;

                                                return loading ? (
                                                    <Skeleton key={index} className='h-4' />
                                                ) : (
                                                    <motion.p
                                                        key={index}
                                                        onClick={() => {
                                                            setSearching(true);
                                                            onSearch(value, key as 'albums' | 'tracks');
                                                        }}
                                                        variants={{
                                                            hidden: { opacity: 0, y: 5 },
                                                            visible: { opacity: 1, y: 0 }
                                                        }}
                                                        className='text-xs sm:text-sm hover:underline underline-offset-2 decoration-1 h-fit w-full truncate cursor-pointer justify-start text-muted-foreground'
                                                        title={result.title}
                                                    >
                                                        {result.title}
                                                    </motion.p>
                                                );
                                            })}
                                            {results?.[key as 'albums' | 'tracks']?.items.length === 0 && (
                                                <p className='w-full h-full flex capitalize items-center justify-center text-xs text-muted-foreground p-4 border-2 border-dashed rounded-md'>
                                                    No Results Found
                                                </p>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AutocompleteCard;
