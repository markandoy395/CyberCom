import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");
  const competitionFrontendPort = Number.parseInt(
    env.COMPETITION_FRONTEND_PORT || "5175",
    10
  );
  const backendPort = Number.parseInt(env.BACKEND_PORT || "3000", 10);

  return {
    root: path.resolve(projectRoot, "./competition-client"),
    publicDir: path.resolve(projectRoot, "./public"),
    envDir: projectRoot,
    plugins: [react()],
    cacheDir: path.resolve(projectRoot, "./node_modules/.vite/competition"),
    resolve: {
      alias: {
        "@": path.resolve(projectRoot, "./src"),
        "@components": path.resolve(projectRoot, "./src/components"),
        "@pages": path.resolve(projectRoot, "./src/pages"),
        "@services": path.resolve(projectRoot, "./src/services"),
        "@utils": path.resolve(projectRoot, "./src/utils"),
        "@hooks": path.resolve(projectRoot, "./src/hooks"),
        "@contexts": path.resolve(projectRoot, "./src/contexts"),
        "@config": path.resolve(projectRoot, "./src/config"),
        "@styles": path.resolve(projectRoot, "./src/styles"),
        "@assets": path.resolve(projectRoot, "./src/assets"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: competitionFrontendPort,
      strictPort: true,
      fs: {
        allow: [projectRoot],
      },
      proxy: {
        "/api": {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
          secure: false,
          rewrite: requestPath => requestPath,
        },
      },
    },
    build: {
      outDir: path.resolve(projectRoot, "dist-competition"),
      emptyOutDir: true,
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
