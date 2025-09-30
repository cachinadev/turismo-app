// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ['es', 'en', 'fr', 'pt', 'ru'],
    defaultLocale: 'es',
    // Only `false` is allowed in Next 14 if you set this key;
    // remove the line entirely if you prefer the default behavior.
    localeDetection: false,
  },
};

module.exports = nextConfig;
