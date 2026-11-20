import { createRoot } from "react-dom/client";
import { ComponentesProvider, type ApiHttp } from "@componentes/react";
import { App } from "./App";

// API de mentira, só para a Fase 0. As Fases 4/5 trocam por axios apontando para o back de exemplo.
const apiExemplo: ApiHttp = {
  post: () => Promise.reject(new Error("Backend de exemplo ainda não configurado.")),
  get: () => Promise.reject(new Error("Backend de exemplo ainda não configurado.")),
};

createRoot(document.getElementById("raiz")!).render(
  <ComponentesProvider api={apiExemplo}>
    <App />
  </ComponentesProvider>,
);
