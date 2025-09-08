// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // IMPORTANT: do NOT set `output: 'export'` for Vercel App Router + dynamic routes
  reactStrictMode: true,
  images: {
    // keep defaults unless you truly need static export
    unoptimized: false,
  },
  // experimental: { appDir: true } // only if you had it; not required in Next 14+
};

module.exports = nextConfig;
