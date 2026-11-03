import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local loopback address used to open the app from the IDE/browser.
  // Next dev blocks its HMR connection unless this hostname is explicitly allowed.
  allowedDevOrigins: ["127.0.2.2"],
  // Server Function arguments can contain passwords and other sensitive form data.
  // Keep development request logs, but do not print action arguments to the terminal.
  logging: {
    serverFunctions: false,
  },
};

export default nextConfig;
