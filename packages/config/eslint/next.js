import js from '@eslint/js';
import pluginNext from '@next/eslint-plugin-next';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginPrettier from 'eslint-plugin-prettier/recommended';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { config as baseConfig } from './base.js';

/**
 * A custom ESLint configuration for libraries that use Next.js.
 *
 * This configuration:
 * - Enforces Prettier formatting rules (reads from .prettierrc)
 * - Enforces TypeScript code quality rules based on code quality standards
 * - Integrates Next.js and React best practices
 *
 * @type {import("eslint").Linter.Config}
 * */
export const nextJsConfig = [
  ...baseConfig,
  js.configs.recommended,
  eslintConfigPrettier, // Disables conflicting ESLint rules
  pluginPrettier, // Enforces Prettier formatting (reads from .prettierrc)
  ...tseslint.configs.recommended,
  {
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    plugins: {
      '@next/next': pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
    },
  },
  {
    plugins: {
      'react-hooks': pluginReactHooks,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      // React scope no longer necessary with new JSX transform.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-children-prop': 'off',
    },
  },
  {
    rules: {
      // ============================================
      // TypeScript 代码质量规范 (基于代码质量与类型定义规范.md)
      // ============================================

      // 1. 类型安全规则
      // 禁止使用 any 类型（必要时使用 unknown）
      '@typescript-eslint/no-explicit-any': [
        'error',
        {
          fixToUnknown: true, // 自动修复为 unknown
          ignoreRestArgs: false, // REST 参数也需要类型
        },
      ],

      // 要求使用 type-only imports（import type）
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports', // 优先使用 type-only imports
          fixStyle: 'separate-type-imports', // 类型和值分开导入
          disallowTypeAnnotations: false,
        },
      ],

      // 禁止未使用的变量
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // 要求函数返回类型（可选，但推荐）
      '@typescript-eslint/explicit-function-return-type': 'off', // 关闭，因为 TypeScript 可以推断

      // 要求模块边界类型（可选，但推荐）
      '@typescript-eslint/explicit-module-boundary-types': 'off', // 关闭，因为 TypeScript 可以推断

      // 2. 类型定义规则
      // 优先使用 interface 而不是 type（用于对象类型）
      '@typescript-eslint/consistent-type-definitions': [
        'warn',
        'interface', // 优先使用 interface
      ],

      // 3. 命名规范
      // 类型名称使用 PascalCase（由 TypeScript 编译器自动检查）
      // Props 类型以 Props 结尾（由命名约定保证，无法自动检查）

      // 4. 其他类型安全规则
      // 禁止非空断言（使用类型守卫代替）
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // 注意：以下规则需要类型信息（parserOptions.project），会显著降低性能
      // 对于 Next.js 项目，不建议启用这些规则
      // 如果确实需要，可以在 tsconfig.json 中配置 parserOptions.project
      // '@typescript-eslint/prefer-nullish-coalescing': 'warn', // 需要类型信息
      // '@typescript-eslint/prefer-optional-chain': 'warn', // 需要类型信息

      // 禁止使用 @ts-ignore
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true, // 禁止 ts-ignore
          'ts-nocheck': true, // 禁止 ts-nocheck
          'ts-check': false,
        },
      ],
    },
  },
];
