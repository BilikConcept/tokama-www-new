import type { NextConfig } from "next";
import { LEGACY_ARTICLE_SLUGS } from "./lib/content-studio/article-slugs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "www.przelewy24.pl", pathname: "/themes/przelewy24/assets/**" },
    ],
  },
  async redirects() {
    return [
      ...Object.entries(LEGACY_ARTICLE_SLUGS).map(([legacySlug, slug]) => ({
        source: `/blog/${legacySlug}`,
        destination: `/blog/${slug}`,
        permanent: true,
      })),
      {
        source: "/domki-na-wynajem",
        destination: "/domki",
        permanent: true,
      },
      {
        source: "/video",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
