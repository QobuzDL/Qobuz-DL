'use client';

import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Button } from './button';
import { ClockIcon, FileClockIcon, XIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Input } from './input';
import { ScrollArea } from './scroll-area';

type ChangeLog = {
    title: string;
    date: string;
    changes: string[];
};

export function ChangelogDialog() {
    const [open, setOpen] = useState<boolean>(false);

    const [logs, setLogs] = useState<ChangeLog[]>([]);
    const [query, setQuery] = useState<string>('');

    const fetchChangelog = async () => {
        try {
            const response = await axios.get('/api/changelog');
            const data = ((await response.data) as ChangeLog[]).sort((a, b) => parseInt(a.date) - parseInt(b.date));
            setLogs(data);
        } catch {
            setLogs([]);
        }
    };

    useEffect(() => {
        fetchChangelog();
    }, [open]);

    const filtered = logs.filter((log) => log.title.toLowerCase().includes(query.toLowerCase()));

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    title='Changelog'
                    variant='outline'
                    size='icon'
                    onClick={() => {
                        setOpen(true);
                    }}
                >
                    <FileClockIcon />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Changelog Reports</DialogTitle>
                    <DialogDescription>View the latest updates and features</DialogDescription>
                </DialogHeader>
                <div className='relative'>
                    <Input placeholder='Search...' value={query} onChange={(e) => setQuery(e.target.value)} />
                    {query && (
                        <XIcon
                            className='absolute right-3 size-4 text-muted-foreground hover:opacity-100 transition-colors opacity-75 top-1/2 -translate-y-1/2 cursor-pointer'
                            onClick={() => setQuery('')}
                        />
                    )}
                </div>
                <div className='-mt-4'>
                    <ScrollArea className='space-y-6 flex flex-col gap-6 max-h-[450px]'>
                        <div className='space-y-6'>
                            {filtered.length > 0 ? (
                                filtered.map((log, index) => {
                                    return (
                                        <div key={index} className='space-y-3'>
                                            <div className='space-y-1'>
                                                <h3 className='text-md font-semibold'>{log?.title ?? 'N/A'}</h3>
                                                <div title={String(log?.date)} className='flex items-center gap-1.5'>
                                                    <ClockIcon className='text-sm text-muted-foreground size-3.5' />
                                                    <span className='text-sm text-muted-foreground'>
                                                        {log?.date ? new Date(log?.date).toDateString() : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                            <ul className='list-disc pl-4 text-sm space-y-1'>
                                                {log?.changes?.map((change, index) => (
                                                    <li key={index}>{change ?? 'N/A'}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className='space-y-3'>
                                    <div className='space-y-1'>
                                        <h3 className='text-sm font-semibold'>No changelog(s) found</h3>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default ChangelogDialog;
