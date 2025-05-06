/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turn off SWC's minifier to avoid issues
  swcMinify: false,

  // Ignore ESLint errors during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable image optimization for simplicity
  images: { unoptimized: true },

  // Configure webpack
  webpack: (config, { isServer, dev }) => {
    // Disable cache in development to prevent ENOENT errors
    if (dev) {
      config.cache = false;
    }

    // Fix for canvas-confetti on the client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
      };
    }

    return config;
  },

  // Transpile canvas-confetti so it works with Next's SWC loader
  transpilePackages: ['canvas-confetti'],
  
  // Output settings for Netlify
  output: 'standalone',
};

module.exports = nextConfig;