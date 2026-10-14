import type { NextConfig } from "next";

const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim()
  || "https://pub-b885074c7e424bceb5e8ad163c04ced7.r2.dev";
const r2RemotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

if (r2PublicUrl) {
  try {
    const publicUrl = new URL(r2PublicUrl);

    if (publicUrl.protocol === "https:" && !publicUrl.username && !publicUrl.password && !publicUrl.search && !publicUrl.hash) {
      r2RemotePatterns.push({
        protocol: "https",
        hostname: publicUrl.hostname,
        port: publicUrl.port,
        pathname: `${publicUrl.pathname.replace(/\/+$/, "")}/**`,
      });
    }
  } catch {
    // Invalid storage URLs are reported when a public file URL is requested.
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: r2RemotePatterns,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
