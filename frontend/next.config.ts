import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase proxy timeout to 5 minutes for long-running OpenAI agent calls
  experimental: {
    proxyTimeout: 300_000,
  },
  async rewrites() {
    return [
      {
        // Proxy all /api/ requests (except /api/auth/) to Express backend on port 5000
        source: '/api/:path((?!auth).*)',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
