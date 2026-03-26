import { defineConfig } from "vite";
import { resolve } from "path";

const workspaceRoot = resolve(__dirname, "..");
const icpRoot = resolve(__dirname, "../icp_proposals_mvp");

export default defineConfig({
  envDir: icpRoot,
  envPrefix: ["VITE_", "CANISTER_", "DFX_"],
  server: {
    host: "0.0.0.0",
    port: 3001,
    fs: {
      allow: [workspaceRoot],
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
  define: {
    global: "globalThis",
  },
});
