import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "local-only-vision-policy",
      transformIndexHtml: {
        order: "post",
        handler(html, ctx) {
          const scripts = ctx.server
            ? "'self' 'unsafe-inline' 'wasm-unsafe-eval'"
            : "'self' 'wasm-unsafe-eval'";
          const connections = ctx.server
            ? "'self' ws://127.0.0.1:* ws://localhost:*"
            : "'self'";
          return {
            html,
            tags: [
              {
                tag: "meta",
                attrs: {
                  "http-equiv": "Content-Security-Policy",
                  content: `default-src 'self'; script-src ${scripts}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src ${connections}; worker-src 'self' blob:; object-src 'none'; base-uri 'self'`,
                },
                injectTo: "head-prepend",
              },
            ],
          };
        },
      },
    },
  ],
  base: process.env.VITE_BASE_PATH || "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pdf: ["pdf-lib"],
          zip: ["jszip"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
