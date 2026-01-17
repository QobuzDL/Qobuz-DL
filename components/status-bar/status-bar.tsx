'use client';
import QueueDialog from './queue-dialog';
import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ChevronDown, ChevronUp, DotIcon, List as QueueIcon, LucideIcon, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Progress } from '../ui/progress';
import { useStatusBar } from '@/lib/status-bar/context';

export type QueueProps = {
    title: string;
    icon?: LucideIcon | null;
    UUID: string;
    remove?: () => void;
};

export type StatusBarProps = {
    open: boolean;
    openPreference: boolean;
    title: string;
    description: string;
    progress: number;
    processing: boolean;
    queue?: QueueProps[];
    onCancel?: () => void;
};

const StatusBar = () => {
    const { statusBar, setStatusBar } = useStatusBar();
    const [queueOpen, setQueueOpen] = useState<boolean>(false);

    return (
        <>
            <AnimatePresence>
                {statusBar.open && (
                    <motion.div
                        key='progress'
                        className='w-full z-[20] absolute bottom-0 left-0 pointer-events-auto'
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: 'spring' }}
                        exit={{ y: 100, opacity: 0 }}
                    >
                        <Card>
                            <CardHeader className='flex items-center flex-row justify-between transition-[height] pt-4 overflow-hidden pb-2'>
                                <Button
                                    variant='ghost'
                                    size='icon'
                                    onClick={() => setQueueOpen(true)}
                                    className='size-6'
                                    disabled={statusBar.queue ? statusBar.queue.length === 0 : true}
                                >
                                    <QueueIcon className='w-4 h-4' />
                                </Button>
                                <div className='flex flex-col justify-center text-center items-center overflow-x-hidden px-2'>
                                    <CardTitle className='text-nowrap max-w-full truncate p-1'>{statusBar.title || 'No items in the queue'}</CardTitle>
                                    <AnimatePresence>
                                        {statusBar.description && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10, maxHeight: 0 }}
                                                animate={{ opacity: 1, y: 0, maxHeight: 100 }}
                                                exit={{ opacity: 0, y: 10, maxHeight: 0 }}
                                                className='max-w-full'
                                            >
                                                <CardDescription className='text-nowrap max-w-full truncate'>{statusBar.description}</CardDescription>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <Button
                                    variant='ghost'
                                    size='icon'
                                    onClick={() =>
                                        setStatusBar({
                                            ...statusBar,
                                            open: false,
                                            openPreference: !statusBar.processing
                                        })
                                    }
                                    className='size-6'
                                >
                                    <ChevronDown className='w-4 h-4' />
                                </Button>
                            </CardHeader>
                            <CardContent className='flex items-center justify-center gap-2'>
                                <Progress value={statusBar.progress} />
                                <Button
                                    variant='ghost'
                                    size='icon'
                                    className='size-6 pointer-events-auto'
                                    disabled={!statusBar.processing}
                                    onClick={statusBar.onCancel}
                                >
                                    <X className='w- h-4' />
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
            {!statusBar.open && (
                <motion.div
                    key='open'
                    className='w-full z-[20] flex items-end justify-center absolute bottom-0 h-full'
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                >
                    <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setStatusBar({ ...statusBar, open: true, openPreference: true })}
                        className='sm:w-[20%] w-[80%] flex items-center justify-center flex-col py-4 gap-1 h-auto pointer-events-auto'
                    >
                        <ChevronUp className='w-4 h-4' />
                        <AnimatePresence>
                            {statusBar.description && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, maxHeight: 0 }}
                                    animate={{ opacity: 1, y: 0, maxHeight: 20 }}
                                    exit={{ opacity: 0, y: 10, maxHeight: 0 }}
                                    className='flex items-center justify-center text-center'
                                >
                                    <p>{statusBar.description}</p>
                                    <DotIcon className='min-w-[20px] min-h-[20px] size-[20px]' />
                                    <p>{Math.round(statusBar.progress)}%</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Button>
                </motion.div>
            )}

            <QueueDialog open={queueOpen} setOpen={setQueueOpen} queueItems={statusBar.queue || []} />
        </>
    );
};

export default StatusBar;
