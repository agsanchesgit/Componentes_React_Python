import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// App de demonstração: importa a biblioteca direto do código-fonte.
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: { "@componentes/react": resolve(__dirname, "../src/index.ts") },
  },
});
