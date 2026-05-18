import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // React Compiler strict rules — the codebase predates these and uses
      // intentional patterns (e.g. freeze refs during focus mode in
      // dashboard pages). React Compiler isn't enabled in next.config.ts,
      // so these are advisory only. Downgrade to warnings until the planned
      // refactor; revisit if/when React Compiler is enabled.
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
