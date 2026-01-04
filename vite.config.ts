import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env so .env.local / .env.test are respected per mode.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: './',
    server: {
      host: "0.0.0.0",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Expose APP_ENV if we ever need it at build time (VITE_* are already handled by Vite).
      __APP_ENV__: JSON.stringify(env.VITE_APP_ENV ?? ''),
    },
  };
});
