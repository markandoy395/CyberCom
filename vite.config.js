import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const frontendPort = Number.parseInt(env.FRONTEND_PORT || "5174", 10);
  const backendPort = Number.parseInt(env.BACKEND_PORT || "3000", 10);

  return {
    plugins: [react()],
    cacheDir: path.resolve(__dirname, "./node_modules/.vite/main"),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@pages": path.resolve(__dirname, "./src/pages"),
        "@services": path.resolve(__dirname, "./src/services"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@hooks": path.resolve(__dirname, "./src/hooks"),
        "@contexts": path.resolve(__dirname, "./src/contexts"),
        "@config": path.resolve(__dirname, "./src/config"),
        "@styles": path.resolve(__dirname, "./src/styles"),
        "@assets": path.resolve(__dirname, "./src/assets"),
      },
    },
    server: {
      host: "0.0.0.0", // allows access via local IP
      port: frontendPort,
      strictPort: true,
      proxy: {
        "/api": {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => {
            // Direct proxy - no rewriting needed for Express
            // Path /api/submissions -> /api/submissions
            return path;
          },
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
          },
        },
      },
    },

    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "react-icons/fa",
        "react-icons/fa6",
        "react-icons/fi",
      ],
    },
  };
});
