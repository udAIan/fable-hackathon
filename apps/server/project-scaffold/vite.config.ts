import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev/preview server is reachable from the studio app's preview iframe via the
// sandbox host (*.e2b.app). Port 5175 is the convention the future preview wiring
// will look for.
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5175,
    strictPort: true,
    allowedHosts: [".e2b.app"],
  },
  preview: {
    host: "0.0.0.0",
    port: 5175,
    strictPort: true,
    allowedHosts: [".e2b.app"],
  },
  plugins: [react()],
});
