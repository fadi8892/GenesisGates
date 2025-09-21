/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Core behavior
  reactStrictMode: true,         // catches subtle issues in dev
  swcMinify: true,               // smaller, faster builds
  poweredByHeader: false,        // security hardening
  compress: true,                // gzip/brotli dynamic responses

  // ✅ Absolutely DO NOT export statically (you have API routes)
  // output: 'export', // ❌ never enable this for your app

  // ✅ Images: modern formats + allow your known hosts
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'genesisgates.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' }, // used by the Hero
      // add more hosts you actually load from
    ],
  },

  // ✅ Production safety: keep builds honest
  eslint: {
    // leave this false so CI fails on real lint errors
    ignoreDuringBuilds: false,
  },
  typescript: {
    // leave this false so CI fails on real TS errors
    ignoreBuildErrors: false,
  },

  // ✅ Small bundles out of the box
  experimental: {
    // Tree-shake common libs better (Next 14.2+)
    optimizePackageImports: [
      'framer-motion',
      'clsx',
      // add more heavy packages you import from often
      // 'date-fns', 'lodash', etc.
    ],
  },

  // ✅ Helpful headers (safe defaults that won’t break assets)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // HSTS: enable after you’re sure you always serve HTTPS on your domains
          { key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains; preload' },
          // Trim powerful APIs by default; expand if you need them
          {
            key: 'Permissions-Policy',
            value: [
              'accelerometer=()',
              'camera=()',
              'geolocation=()',
              'gyroscope=()',
              'magnetometer=()',
              'microphone=()',
              'payment=()',
              'usb=()',
              'screen-wake-lock=()',
              'xr-spatial-tracking=()',
            ].join(', '),
          },
        ],
      },
    ];
  },

  // ✅ Smart redirects/rewrites (leave empty until you need them)
  async redirects() {
    return [
      // Example:
      // { source: '/old', destination: '/new', permanent: true },
    ];
  },
  async rewrites() {
    return [
      // Example (proxy an external API under your domain):
      // {
      //   source: '/api/proxy/:path*',
      //   destination: 'https://external.example.com/:path*',
      // },
    ];
  },

  // ✅ Webpack tweaks (avoid server-side Leaflet issues, keeps build clean)
  webpack: (config, { isServer }) => {
    // Leaflet expects `window`; ensure you only import it in client components.
    // This alias prevents accidental server bundling of browser-only shims.
    if (isServer) {
      config.resolve.alias['canvas'] = false;
    }
    return config;
  },
};

module.exports = nextConfig;
