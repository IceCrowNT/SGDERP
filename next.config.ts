import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["docx", "exceljs", "pdf-lib", "@pdf-lib/fontkit", "pdfjs-dist", "@napi-rs/canvas", "@xmldom/xmldom", "jszip"],
  outputFileTracingIncludes: { "/*": ["./src/lib/ai-pdf-worker.cjs", "./src/lib/ai-word-edit-worker.cjs", "./node_modules/pdfjs-dist/**/*", "./node_modules/@napi-rs/canvas*/**/*", "./node_modules/@xmldom/xmldom/**/*", "./node_modules/jszip/**/*", "./src/lib/ai-sheet-worker.cjs", "./src/lib/ai-document-worker.cjs", "./node_modules/docx/**/*", "./node_modules/exceljs/**/*", "./node_modules/pdf-lib/**/*", "./node_modules/xlsx/**/*", "./node_modules/cfb/**/*", "./node_modules/codepage/**/*", "./node_modules/ssf/**/*", "./node_modules/wmf/**/*", "./node_modules/word/**/*", "./node_modules/frac/**/*", "./node_modules/adler-32/**/*", "./node_modules/crc-32/**/*"] },
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  // Local loopback address used to open the app from the IDE/browser.
  // Next dev blocks its HMR connection unless this hostname is explicitly allowed.
  allowedDevOrigins: ["127.0.2.2"],
  // Server Function arguments can contain passwords and other sensitive form data.
  // Keep development request logs, but do not print action arguments to the terminal.
  logging: {
    serverFunctions: false,
    incomingRequests: { ignore: [/^\/api\/office\//] },
  },
};

export default nextConfig;
