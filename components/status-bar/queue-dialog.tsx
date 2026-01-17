import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import QueueView from './queue-view';
import type { QueueProps } from './status-bar';

const QueueDialog = ({ open, setOpen, queueItems }: { open: boolean; setOpen: (open: boolean) => void; queueItems: QueueProps[] | [] }) => {
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className='sm:max-w-[600px]'>
                <DialogHeader>
                    <DialogTitle>Queue</DialogTitle>
                    <DialogDescription>
                        {queueItems.length > 0 ? `${queueItems.length} ${queueItems.length > 1 ? 'items' : 'item'} in queue` : 'No items in the queue'}
                    </DialogDescription>
                </DialogHeader>
                <QueueView queueItems={queueItems} />
            </DialogContent>
        </Dialog>
    );
};

export default QueueDialog;
