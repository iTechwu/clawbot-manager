/**
 * ESLint configuration for NestJS projects
 * Usage: import and spread in your eslint config
 */
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

const nestjsConfig = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettier,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: {
        node: true,
        jest: true,
      },
    },
    rules: {
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-require-imports": "off",
      "prettier/prettier": [
        "error",
        {
          semi: true,
          trailingComma: "all",
          singleQuote: true,
          printWidth: 100,
          tabWidth: 2,
        },
      ],
    },
  },
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "*.js",
      "*.mjs",
      "coverage/**",
      ".turbo/**",
    ],
  }
);

export default nestjsConfig;
