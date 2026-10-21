import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Function arguments can contain passwords and other sensitive form data.
  // Keep development request logs, but do not print action arguments to the terminal.
  logging: {
    serverFunctions: false,
  },
};

export default nextConfig;
