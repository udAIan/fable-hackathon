import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This app runs only inside the E2B sandbox and is shown in the studio's preview
// iframe via the sandbox host (https://5175-<id>.e2b.app, served on 443). HMR's
// client must connect back over the proxy port (443), not the dev port — hence
// server.hmr.clientPort.
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5175,
    strictPort: true,
    allowedHosts: [".e2b.app"],
    hmr: { clientPort: 443 },
  },
  preview: {
    host: "0.0.0.0",
    port: 5175,
    strictPort: true,
    allowedHosts: [".e2b.app"],
  },
  plugins: [react()],
});
