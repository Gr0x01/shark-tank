import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rhwfizaqeprgnslcagse.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        // Kevin O'Leary had a duplicate shark record (curly vs straight apostrophe)
        // holding 9 of his deals; merged into kevin-oleary on Aug 2, 2026. This slug
        // was live and in the sitemap, so it redirects rather than 404s.
        source: '/sharks/kevin-o-leary',
        destination: '/sharks/kevin-oleary',
        permanent: true,
      },
      {
        // Three more duplicate shark records from the Dec 2025 import, merged Aug 2, 2026:
        // the model had written Lubetzky as a bare first name and as a misspelling, and
        // Rashaun Williams with a middle initial.
        source: '/sharks/daniel',
        destination: '/sharks/daniel-lubetzky',
        permanent: true,
      },
      {
        source: '/sharks/daniel-lubetsky',
        destination: '/sharks/daniel-lubetzky',
        permanent: true,
      },
      {
        source: '/sharks/rashaun-l-williams',
        destination: '/sharks/rashaun-williams',
        permanent: true,
      },
      {
        // Duplicate product records from the same Dec 2025 import, merged Aug 2, 2026.
        source: '/products/wicked-good-cupcakes',
        destination: '/products/wicked-good-cupcakes-in-a-jar',
        permanent: true,
      },
      {
        source: '/products/the-bouqs-company-flowers-shipped-from-a-volcano',
        destination: '/products/the-bouqs-company',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
