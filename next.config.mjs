/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "omarko.vercel.app" }],
        destination: "https://omarko.co.uk/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/manifest.webmanifest", destination: "/api/manifest" },
    ];
  },
};

export default nextConfig;
