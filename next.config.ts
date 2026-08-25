import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "lqlfciaelhmaozxwunun.supabase.co";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Next autorise plus, mais Vercel coupe le corps HTTP vers ~4,5 Mo.
      // Les photos sont donc compressées côté navigateur avant l’action.
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
