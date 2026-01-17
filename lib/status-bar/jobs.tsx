import { StatusBarProps } from '@/components/status-bar/status-bar';
import { LucideIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

let jobs = [] as { ready: () => Promise<void>; UUID: string }[];

export function loadStatusBarValue(setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>): Promise<StatusBarProps> {
    return new Promise((resolve) => {
        setStatusBar((prev) => (resolve(prev), prev));
    });
}

export async function createJob(
    setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>,
    QueueTitle: string,
    QueueIcon: LucideIcon,
    ready: () => Promise<void>
) {
    let running;
    const UUID = uuidv4();
    const job = { ready, UUID };
    const updateJob = async () => {
        const statusBar: StatusBarProps = await loadStatusBarValue(setStatusBar);
        if (statusBar!.processing) {
            setStatusBar((prev) => ({
                ...prev,
                queue: [
                    ...(prev.queue || []),
                    {
                        title: QueueTitle,
                        UUID: UUID,
                        icon: QueueIcon,
                        remove: () => {
                            jobs = jobs.filter((item) => item.UUID !== UUID);
                        }
                    }
                ]
            }));
        } else {
            running = true;
            setStatusBar((prev) => ({ ...prev, processing: true, open: prev.openPreference, progress: 0 }));
            ready().then(() => {
                jobs.shift();
                if (jobs.length <= 0) {
                    setStatusBar((prev) => ({
                        ...prev,
                        open: false,
                        title: '',
                        description: '',
                        progress: 0,
                        processing: false
                    }));
                }
            });
        }
    };
    await updateJob();
    jobs.push(job);
    if (!running) {
        const interval = setInterval(async () => {
            if (jobs[0] === job) {
                setStatusBar((prev) => ({
                    ...prev,
                    processing: false,
                    onCancel: () => {},
                    queue: prev.queue?.filter((item) => item.UUID !== UUID),
                    progress: 0
                }));
                clearInterval(interval);
                await updateJob();
            }
        }, 100);
    }
}
