// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    // Copy non-bundled files to dist after build
    {
      name: "copy-extension-files",
      closeBundle() {
        // Copy manifest
        copyFileSync("public/manifest.json", "dist/manifest.json");

        // Copy background and content scripts (not bundled by Vite)
        // These are referenced directly in manifest
        try {
          mkdirSync("dist", { recursive: true });
        } catch (_) {}
      },
    },
  ],

  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        sidepanel: resolve(__dirname, "sidepanel.html"),
        background: resolve(__dirname, "src/background/background.js"),
        content: resolve(__dirname, "src/content/content.js"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },

  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/shared"),
      "@storage": resolve(__dirname, "src/shared/storage"),
      "@llm": resolve(__dirname, "src/shared/llm"),
      "@parser": resolve(__dirname, "src/shared/parser"),
    },
  },
});
