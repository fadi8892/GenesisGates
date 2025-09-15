/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["framer-motion", "clsx"]
  },
  images: { formats: ["image/avif", "image/webp"] },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true
};

export default nextConfig;
