'use client';
import React, { useEffect, useState } from 'react';
import StatusBar from './status-bar';
import { cn } from '@/lib/utils';

const StatusBarContainer = () => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;
    return (
        <div
            className={cn(
                'px-4 pb-4 pt-6 overflow-hidden mx-auto w-full fixed bottom-0 flex min-h-[156px] z-[20] justify-center bg-gradient-to-b from-transparent pointer-events-none to-primary/5'
            )}
        >
            <div className='container relative flex'>
                <StatusBar />
            </div>
        </div>
    );
};

export default StatusBarContainer;
