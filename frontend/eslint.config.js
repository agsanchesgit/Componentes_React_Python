import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Regra do usuário: sempre chaves em if/else/for/while/do, mesmo com um só comando.
      curly: ["error", "all"],
    },
  },
);
