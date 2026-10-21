// Shared ESLint flat config for every package in this monorepo.
// Each package's `lint` script points here with `--config ../../eslint.config.js`.
// Errors are reserved for likely bugs; style and cleanup findings are warnings
// so lint can gate CI without blocking on cosmetic issues.
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const softened = {
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-require-imports': 'off',
  '@typescript-eslint/no-unused-expressions': 'warn',
  'no-empty': ['warn', { allowEmptyCatch: true }],
  'no-useless-escape': 'warn',
  'no-async-promise-executor': 'warn',
  'prefer-const': 'warn',
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-*/**',
      '**/dist-bundle/**',
      '**/build/**',
      '**/release/**',
      '**/.cache/**',
      '**/resources/web-dist/**',
      '**/resources/opencode-cli/**',
      'packages/mobile/ios/**',
      'packages/mobile/android/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: softened,
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },
  {
    // Build-time constants injected by the bundler (scripts/bundle-main.mjs).
    files: ['packages/electron/**/*.mjs', '**/*.mjs'],
    languageOptions: { globals: { __OPENCODESILVER_UPDATER_E2E_BUILD__: 'readonly' } },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Scoped exemption for control regex where raw binary/protocol/url parsing is required
    files: [
      '**/sync/binary.ts',
      '**/lib/url.ts',
      '**/markdownCore.test.ts',
      '**/MessageBody.tsx',
    ],
    rules: {
      'no-control-regex': 'off',
    },
  },
  {
    // Accessibility rules for JSX components
    files: ['**/*.{tsx,jsx}'],
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
    },
  },
  {
    // Legacy modules with historical any types — warn while new code strictly enforces typed contracts
    files: [
      '**/src/**/*.{ts,tsx}',
      'src/**/*.{ts,tsx}',
      '**/webview/**/*.{ts,tsx}',
      'webview/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
