import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'test.finder.zcus.dev',
    'finder.zcus.dev',
  ],
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://localhost:34002/:path*',
      },
    ];
  },
};

export default nextConfig;
