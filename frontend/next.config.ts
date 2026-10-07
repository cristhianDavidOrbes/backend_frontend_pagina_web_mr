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
