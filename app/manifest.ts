import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: process.env.NEXT_PUBLIC_APPLICATION_NAME! === 'Qobuz-DL' ? 'Qobuz Downloader' : process.env.NEXT_PUBLIC_APPLICATION_NAME!,
        short_name: process.env.NEXT_PUBLIC_APPLICATION_NAME!,
        description: 'A frontend browser client for downloading music from Qobuz, .',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        orientation: 'portrait',
        icons: [
            {
                src: 'https://avatars.githubusercontent.com/u/181405705?s=200&v=4',
                sizes: '200x200',
                type: 'image/png'
            }
        ]
    };
}
