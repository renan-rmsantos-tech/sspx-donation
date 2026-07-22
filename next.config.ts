import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rmsantos-donation-pix-qr.nyc3.digitaloceanspaces.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname:
          'rmsantos-donation-product-photos.nyc3.digitaloceanspaces.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
