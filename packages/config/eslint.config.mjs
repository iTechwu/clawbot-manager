import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "node_modules/**",
    "*.config.js",
    "*.config.mjs",
    "*.config.ts"
  ]),
  {
    rules: {
      "react/no-children-prop": "off",
    },
  },
]);

export default eslintConfig;

