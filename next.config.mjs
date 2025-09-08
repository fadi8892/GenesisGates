// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do NOT use output: 'export' on Vercel for this app
  reactStrictMode: true,
  images: {
    unoptimized: false,
  },
  // plugins: [{ name: 'next' }] // Next may auto-add this; harmless
};

export default nextConfig;
