import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  serverExternalPackages: ["@prisma/client"],
  turbopack: {
    resolveAlias: {
      ".prisma/client/default": "./node_modules/.prisma/client/default.js"
    },
  },
};

export default nextConfig;