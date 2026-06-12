import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,  // ← this line
  },
};

export default nextConfig;
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'static.qobuz.com',
                port: '',
                pathname: '**',
                search: ''
            }
        ]
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*'
                    },
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin'
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'require-corp'
                    }
                ]
            }
        ];
    }
};

export default nextConfig;
