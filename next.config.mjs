// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server build for Vercel (no static export)
  reactStrictMode: true,
  images: {
    unoptimized: false,
  },
  // plugins: [{ name: 'next' }] // Next may auto-add this; harmless
};

module.exports = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};
