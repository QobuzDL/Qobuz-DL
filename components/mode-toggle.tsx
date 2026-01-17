'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ChevronDownIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export const getHex = (themeValue: string, resolvedTheme: string | undefined): string => {
    if (themeValue === 'auto') {
        return resolvedTheme === 'light' ? '#000000' : '#FFFFFF';
    }

    return themes.flatMap((group) => group.themes).find((theme) => theme.value.toLowerCase() === themeValue.toLowerCase())?.hex || '#FFFFFFF';
};

export const themes = [
    {
        group: 'Base',
        themes: [
            {
                value: 'light',
                label: 'Light',
                hex: '#000000'
            },
            {
                value: 'dark',
                label: 'Dark',
                hex: '#FFFFFF'
            },
            {
                value: 'system',
                label: 'System',
                hex: 'auto'
            }
        ]
    },
    {
        group: 'Colored',
        themes: [
            {
                value: 'purple',
                label: 'Purple',
                hex: '#8b5cf6'
            },
            {
                value: 'pink',
                label: 'Pink',
                hex: '#ec4899'
            },
            {
                value: 'blue',
                label: 'Blue',
                hex: '#3b82f6'
            },
            {
                value: 'green',
                label: 'Green',
                hex: '#16a34a'
            },
            {
                value: 'red',
                label: 'Red',
                hex: '#f43f5e'
            },
            {
                value: 'orange',
                label: 'Orange',
                hex: '#f97316'
            },
            {
                value: 'yellow',
                label: 'Yellow',
                hex: '#fbbf24'
            }
        ]
    }
];

export function ModeToggle() {
    const { setTheme, theme } = useTheme();
    const [position, setPosition] = useState<string>(theme!);

    useEffect(() => {
        document.documentElement.classList.remove(...Array.from(document.documentElement.classList));
        document.documentElement.classList.add(theme!);
    }, [theme]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant='outline' className='flex gap-2 items-center'>
                    <p className='capitalize'>{position}</p>
                    <ChevronDownIcon />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start'>
                <DropdownMenuRadioGroup
                    value={position}
                    onValueChange={(position: string) => {
                        setPosition(position);
                        setTheme(position);
                    }}
                >
                    {themes.map((theme) => (
                        <DropdownMenuRadioGroup key={theme.group} value={position}>
                            <DropdownMenuLabel className='capitalize'>{theme.group}</DropdownMenuLabel>
                            {theme.themes.map((theme) => (
                                <DropdownMenuRadioItem
                                    key={theme.value}
                                    value={theme.value}
                                    className='capitalize'
                                    onClick={() => {
                                        setPosition(theme.value);
                                        setTheme(theme.value);
                                    }}
                                >
                                    {theme.label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
