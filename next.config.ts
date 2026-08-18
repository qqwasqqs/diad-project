import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: "/",
        destination: "/home/my-profile",
        permanent: true, // use true if it's a permanent redirect (301)
      },
      {
        source: "/home",
        destination: "/home/my-profile",
        permanent: true, // use true if it's a permanent redirect (301)
      },
    ];
  },
};

export default nextConfig;
