/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  // Remove basePath/output rewrites unless you intentionally use them.
  // output: 'export',
  // basePath: '/something',
};

module.exports = nextConfig;
