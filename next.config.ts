import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    // WebP seul : l’AVIF est plus lourd à encoder au 1er hit (lent sur 2G).
    formats: ["image/webp"],
    qualities: [50, 64, 75],
    deviceSizes: [360, 414, 640, 750, 828, 1080],
    imageSizes: [48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 14,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      ...(supabaseHost && !supabaseHost.endsWith(".supabase.co")
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      // Next autorise plus, mais Vercel coupe le corps HTTP vers ~4,5 Mo.
      // Les photos sont donc compressées côté navigateur avant l’action.
      bodySizeLimit: "4.5mb",
    },
  },
  async headers() {
    return [
      {
        source: "/brand/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Content-Type", value: "application/xml; charset=utf-8" },
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
