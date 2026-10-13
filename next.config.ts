import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node:sqlite", "bcryptjs"],
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
