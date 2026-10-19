import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

function origenesLocales() {
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((red) => red && red.family === "IPv4")
    .map((red) => red!.address);
  return ["localhost", "127.0.0.1", ...ips];
}

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: origenesLocales(),
  async headers() {
    return [{
      // Only content-addressed generated files are immutable. HTML and APIs
      // must remain independently updateable and authenticated data uncached.
      source: "/intro-scene/runtime/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
