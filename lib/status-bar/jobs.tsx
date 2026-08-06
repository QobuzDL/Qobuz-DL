import { StatusBarProps } from '@/components/status-bar/status-bar';
import { LucideIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Mantenemos la referencia de los trabajos
let jobs: { ready: () => Promise<void>; UUID: string }[] = [];
let isProcessing = false;

export async function createJob(
    setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>,
    QueueTitle: string,
    QueueIcon: LucideIcon,
    ready: () => Promise<void>
) {
    const UUID = uuidv4();
    const newJob = { ready, UUID };
    
    // 1. Añadimos el trabajo a la lista interna de inmediato
    jobs.push(newJob);

    // 2. Actualizamos la UI para mostrar que está en cola
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

    // 3. Iniciamos el procesador si no está corriendo
    processQueue(setStatusBar);
}

async function processQueue(setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>) {
    if (isProcessing || jobs.length === 0) return;

    isProcessing = true;
    const currentJob = jobs[0];

    // Actualizamos la barra para mostrar que empezamos este proceso
    setStatusBar(prev => ({
        ...prev,
        processing: true,
        open: prev.openPreference ?? true,
        // Quitamos el item de la lista visual de "espera"
        queue: prev.queue?.filter(q => q.UUID !== currentJob.UUID)
    }));

    try {
        await currentJob.ready();
    } catch (error) {
        console.error("Error procesando job:", error);
    } finally {
        // Quitamos el trabajo de la lista interna
        jobs.shift();
        isProcessing = false;

        if (jobs.length > 0) {
            // Si hay más, procesamos el siguiente
            processQueue(setStatusBar);
        } else {
            // Si terminamos todo, limpiamos la barra
            setStatusBar((prev) => ({
                ...prev,
                processing: false,
                open: false,
                title: '',
                progress: 0
            }));
        }
    }
}