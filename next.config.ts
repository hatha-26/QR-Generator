import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Halaman /r/[code] harus melakukan HTTP redirect sungguhan dan mencatat scan
  // di setiap request, jadi Cache Components sengaja dimatikan di sini.
  cacheComponents: false,
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
