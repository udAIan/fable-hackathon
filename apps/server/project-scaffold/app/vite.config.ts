import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This app runs only inside the E2B sandbox and is shown in the studio's preview
// iframe via the sandbox host (https://5175-<id>.e2b.app, served on 443). HMR's
// client must connect back over the proxy port (443), not the dev port — hence
// server.hmr.clientPort.
export default defineConfig({
  // Identity injected by the Studio server when it starts the dev server, so
  // the app can call back to the Studio server (e.g. to start a lip-sync job).
  define: {
    "import.meta.env.VITE_STUDIO_PROJECT_ID": JSON.stringify(
      process.env.STUDIO_PROJECT_ID ?? "",
    ),
    "import.meta.env.VITE_STUDIO_API_URL": JSON.stringify(
      process.env.STUDIO_API_URL ?? "",
    ),
  },
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
