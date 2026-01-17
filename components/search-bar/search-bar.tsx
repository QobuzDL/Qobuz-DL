'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '../ui/button';
import { ArrowRightIcon, Loader2Icon, SearchIcon } from 'lucide-react';
import { Label } from '../ui/label';
import axios from 'axios';
import { QobuzSearchResults } from '@/lib/qobuz-dl';
import AutocompleteCard from './autocomplete-card';
import { useCountry } from '@/lib/country-provider';
import CountryPicker from '../country-picker';

const SearchBar = ({
    onSearch,
    searching,
    setSearching,
    query
}: {
    onSearch: (query: string, searchFieldInput?: 'albums' | 'tracks') => void;
    searching: boolean;
    setSearching: React.Dispatch<React.SetStateAction<boolean>>;
    query: string;
}) => {
    const [searchInput, setSearchInput] = useState(query);
    const [results, setResults] = useState<QobuzSearchResults | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [showCard, setShowCard] = useState(false);
    const [controller, setController] = useState<AbortController>(new AbortController());

    const inputRef = useRef<HTMLInputElement>(null);
    const { country } = useCountry();

    useEffect(() => {
        setSearchInput(query);
    }, [query]);

    useEffect(() => {
        if (inputRef.current) setSearchInput(inputRef.current.value);

        const handleKeydown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeydown);

        return () => {
            window.removeEventListener('keydown', handleKeydown);
        };
    }, []);

    useEffect(() => {
        if (searching) controller.abort();
    }, [searching]);

    const fetchResults = async () => {
        controller.abort();
        if (searchInput.trim().length === 0) {
            return;
        }

        setLoading(true);

        const newController = new AbortController();
        setController(newController);

        try {
            setTimeout(async () => {
                try {
                    const response = await axios.get(`/api/get-music?q=${searchInput}&offset=0`, {
                        headers: {
                            'Token-Country': country
                        },
                        signal: newController.signal
                    });
                    if (response.status === 200) setResults(response.data.data);
                } catch {}
            }, 200);
        } catch {}

        setLoading(false);
    };

    useEffect(() => {
        fetchResults();
    }, [searchInput]);

    return (
        <div className='flex items-center gap-2 relative'>
            <div
                onClick={() => inputRef.current?.focus()}
                className='bg-background border relative sm:w-[600px] w-full tracking-wide font-semibold rounded-md flex gap-0.5 items-center py-1 px-3'
            >
                <Label htmlFor='search'>
                    <SearchIcon className='!size-5' />
                </Label>
                <Input
                    id='search'
                    className='focus-visible:outline-none focus-visible:ring-transparent select-none shadow-none outline-none border-none'
                    ref={inputRef}
                    placeholder='Search for anything...'
                    value={searchInput}
                    autoComplete='off'
                    onFocus={(event: React.FocusEvent<HTMLInputElement>) => {
                        setShowCard(true);
                        if (event.currentTarget.value.trim().length > 0) fetchResults();
                    }}
                    onBlur={() => setTimeout(() => setShowCard(false), 50)}
                    onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                        const target = event.currentTarget as HTMLInputElement;
                        if (event.key === 'Enter') {
                            setShowCard(false);
                            if (target.value.trim().length > 0 && !searching) {
                                setSearching(true);
                                onSearch(target.value.trim());
                            }
                        }
                    }}
                    onChange={(event) => {
                        setSearchInput(event.currentTarget.value);
                    }}
                />
                <div className='flex'>
                    <CountryPicker className='hidden sm:flex' />
                </div>
            </div>
            <Button
                size='icon'
                className='w-11 h-11 shrink-0 disabled:bg-muted bg-primary disabled:text-foreground text-primary-foreground hover:text-primary-foreground hover:bg-primary/90'
                variant='ghost'
                onClick={() => {
                    if (searchInput.trim().length > 0 && !searching) {
                        setSearching(true);
                        onSearch(searchInput.trim());
                    }
                }}
                disabled={searching || !(searchInput.trim().length > 0)}
            >
                {searching ? <Loader2Icon className='animate-spin' /> : <ArrowRightIcon />}
            </Button>
            <AutocompleteCard
                searchInput={searchInput}
                showCard={showCard}
                searching={searching}
                setSearching={setSearching}
                results={results}
                loading={loading}
                onSearch={onSearch}
            />
        </div>
    );
};

export default SearchBar;
