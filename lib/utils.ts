import { formatArtists, formatDuration, formatTitle, type QobuzAlbum, type QobuzTrack } from './qobuz-dl';
import { twMerge } from 'tailwind-merge';
import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    const sizeInUnit = bytes / Math.pow(1024, i);

    const formattedSize = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: i >= 3 ? 2 : 0
    }).format(sizeInUnit);

    return `${formattedSize} ${sizes[i]}`;
};

export const cleanFileName = (filename: string) => {
    const bannedChars = ['/', '\\', '?', ':', '*', '"', '<', '>', '|'];
    for (const char in bannedChars) {
        filename = filename.replaceAll(bannedChars[char], '_');
    }
    return filename;
};

export function getTailwindBreakpoint(width: any) {
    if (width >= 1536) {
        return '2xl';
    } else if (width >= 1280) {
        return 'xl';
    } else if (width >= 1024) {
        return 'lg';
    } else if (width >= 768) {
        return 'md';
    } else if (width >= 640) {
        return 'sm';
    } else {
        return 'base'; // Base size (less than 640px)
    }
}

export async function resizeImage(imageURL: string, maxSize: number, quality: number = 0.92): Promise<string | null> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const imgToResize = new Image();
        imgToResize.crossOrigin = 'anonymous';
        imgToResize.src = imageURL;

        imgToResize.onerror = () => resolve(null);

        imgToResize.onload = () => {
            const { width, height } = imgToResize;

            if (width <= maxSize && height <= maxSize) {
                resolve(imageURL);
                return;
            }

            let targetWidth = width;
            let targetHeight = height;

            if (width > height) {
                targetWidth = maxSize;
                targetHeight = (height / width) * maxSize;
            } else {
                targetHeight = maxSize;
                targetWidth = (width / height) * maxSize;
            }

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            context!.drawImage(imgToResize, 0, 0, targetWidth, targetHeight);

            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
        };
    });
}

export function formatCustomTitle(titleSetting: string, result: QobuzAlbum | QobuzTrack): string {
    return titleSetting
        .replaceAll('{artists}', formatArtists(result))
        .replaceAll('{name}', formatTitle(result))
        .replaceAll('{year}', String(new Date(result.released_at * 1000).getFullYear()))
        .replaceAll('{duration}', String(formatDuration(result.duration)));
}
