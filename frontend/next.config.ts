import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output — bundles all deps needed at runtime
  // so the Docker production image stays lean
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
      },
    ],
  },
};

export default nextConfig;
