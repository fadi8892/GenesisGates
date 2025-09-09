/** @type {import('next').NextConfig} */
module.exports = {
  trailingSlash: true,
  images: {
    unoptimized: true, // Disables image optimization, common for server-rendered apps or external image hosting
  },
};
