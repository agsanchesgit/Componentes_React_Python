import { createRoot } from "react-dom/client";
import { ComponentesProvider } from "@componentes/react";
import { criarApiFetch } from "./apiFetch";
import { App } from "./App";

// A base "/api/" é encaminhada pelo Vite para a API Python de exemplo (porta 8100); o Lookup fica em "Lookup".
const apiExemplo = criarApiFetch("/api/");

createRoot(document.getElementById("raiz")!).render(
  <ComponentesProvider api={apiExemplo}>
    <App />
  </ComponentesProvider>,
);
