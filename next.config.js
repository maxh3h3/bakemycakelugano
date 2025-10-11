const withNextIntl = require('next-intl/plugin')('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['framer-motion'],
  },
  webpack: (config, { isServer }) => {
    // Fix for framer-motion with React 19
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'framer-motion': require.resolve('framer-motion'),
      };
    }
    return config;
  },
}

module.exports = withNextIntl(nextConfig)

