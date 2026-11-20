import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Modo biblioteca: saída ESM; react/react-dom ficam de fora (peerDependencies).
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        // O Vite 5 gera "style.css"; o contrato público é "@componentes/react/estilos.css".
        assetFileNames: (info) => (info.name?.endsWith(".css") ? "estilos.css" : "[name][extname]"),
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/testes/preparar.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
