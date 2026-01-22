//frontend/next.config.js
/** @type {import('next').NextConfig} */
const url = require('url');

// -----------------------------------------------------
// 🌐 API Base URL Parsing
// -----------------------------------------------------
const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const parsed = url.parse(apiBase);

// -----------------------------------------------------
// ⚙️ Main Next.js Configuration
// -----------------------------------------------------
const nextConfig = {
  // -----------------------------------------------------
  // 🖼️ Image Optimization
  // -----------------------------------------------------
  images: {
    remotePatterns: [
      {
        protocol: parsed.protocol ? parsed.protocol.replace(':', '') : 'http',
        hostname: parsed.hostname || 'localhost',
        port: parsed.port || '',
        pathname: '/uploads/**',
      },
      { protocol: 'https', hostname: 'www.vicuadvent.com', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'vicuadvent.com', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'www.titilab.store', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'titilab.store', pathname: '/uploads/**' },
      // 🆕 Agregado para imágenes temporales de Unsplash
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // -----------------------------------------------------
  // ⚙️ General Settings
  // -----------------------------------------------------
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: false,

  // -----------------------------------------------------
  // 🧱 Experimental Optimizations
  // -----------------------------------------------------
  experimental: {
    scrollRestoration: true,
  },

  // -----------------------------------------------------
  // 💾 Environment Variables
  // -----------------------------------------------------
  env: {
    NEXT_PUBLIC_API_BASE: apiBase,
  },

};

module.exports = nextConfig;