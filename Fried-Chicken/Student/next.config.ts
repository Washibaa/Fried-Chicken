import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to THIS app. There's a stray package-lock.json in the
  // parent PP/ folder, which made Turbopack treat PP/ as the root and watch its
  // whole tree (parent node_modules, .git, sibling folders) on every change —
  // the main cause of slow/laggy `next dev` on Windows. Scoping the root here
  // keeps file-watching and compilation limited to this project.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
