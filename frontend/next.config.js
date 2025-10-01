// frontend/next.config.js
/** @type {import('next').NextConfig} */

// Helper: parse NEXT_PUBLIC_API_URL for host/port
const url = require('url');
const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const parsed = url.parse(apiBase);

const nextConfig = {
  i18n: {
    locales: ['es', 'en', 'fr', 'pt', 'ru'],
    defaultLocale: 'es',
    localeDetection: false,
  },

  images: {
    remotePatterns: [
      {
        protocol: parsed.protocol ? parsed.protocol.replace(':', '') : 'http',
        hostname: parsed.hostname || 'localhost',
        port: parsed.port || '',
        pathname: '/uploads/**',
      },
      // You can add extra CDNs or fallback domains if needed:
      {
        protocol: 'https',
        hostname: 'www.vicuadvent.com',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'vicuadvent.com',
        pathname: '/uploads/**',
      },
    ],
  },
};

module.exports = nextConfig;
