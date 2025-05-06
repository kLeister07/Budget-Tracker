/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable the buggy SWC minifier (turn back on later if you upgrade Next)
  swcMinify: false,

  // Skip ESLint during CI/Netlify builds
  eslint: { ignoreDuringBuilds: true },

  // Skip Next‑optimized image loader (keeps build simple on Netlify)
  images: { unoptimized: true },

  // Transpile the CommonJS package so we get a proper default export
  transpilePackages: ["canvas-confetti"],

  // Stand‑alone output folder (Netlify likes this)
  output: "standalone",

  webpack: (config, { isServer, dev }) => {
    // Disable cache in dev to avoid intermittent ENOENT errors
    if (dev) config.cache = false;

    // Provide fallbacks for browser build (canvas-confetti pulls 'fs' in SSR mode)
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
};

module.exports = nextConfig;
