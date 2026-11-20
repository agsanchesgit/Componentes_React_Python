import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// App de demonstração: importa a biblioteca direto do código-fonte.
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  // Em desenvolvimento, /api vai para a API Python de exemplo (uvicorn exemplos.api_exemplo:app --port 8100).
  // Outra porta/host: defina API_EXEMPLO (ex.: API_EXEMPLO=http://localhost:9000 npm run exemplos).
  server: { proxy: { "/api": process.env.API_EXEMPLO ?? "http://localhost:8100" } },
  resolve: {
    alias: { "@componentes/react": resolve(__dirname, "../src/index.ts") },
  },
});
