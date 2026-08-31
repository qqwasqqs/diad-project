import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // @databricks/sql pulls in lz4, which loads .node native bindings.
  // Keep it out of the bundle so it is required at runtime on the server.
  serverExternalPackages: ["@databricks/sql", "lz4"],
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
