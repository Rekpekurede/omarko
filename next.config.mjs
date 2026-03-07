/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/manifest.webmanifest", destination: "/api/manifest" },
    ];
  },
};

export default nextConfig;
