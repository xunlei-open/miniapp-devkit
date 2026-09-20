import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginPrettier from 'eslint-plugin-prettier'

export default defineConfig(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/output/**', '**/release/**', '**/coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    plugins: { prettier: eslintPluginPrettier },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-fallthrough': 'off',
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { prettier: eslintPluginPrettier },
    rules: { 'prettier/prettier': 'error' },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    files: [
      'packages/miniapp/src/dev-client.js',
      'examples/**/src/**/*.{js,jsx}',
      'packages/create-miniapp/templates/**/src/**/*.{js,jsx}',
    ],
    languageOptions: { globals: globals.browser },
  },
)
