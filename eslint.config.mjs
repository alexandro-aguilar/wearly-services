import tseslint from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import tsParser from '@typescript-eslint/parser';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    files: ['**/*.ts'],
    ignores: ['node_modules/', 'esbuild.ts', '.dist/*'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
    },
    rules: {
      // Base recommended TS rules
      ...tseslint.configs.recommended.rules,
      // Enforce single quotes (no double quotes)
      quotes: ['error', 'single'],

      // Enforce Prettier formatting
      'prettier/prettier': 'error',
      'class-methods-use-this': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-named-as-default': 'off',
      'import/prefer-default-export': 'off',
      'no-unused-vars': 'off',
      'import/extensions': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-useless-constructor': 'off',
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': ['error', { functions: false, classes: true }],
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      'consistent-return': 'off',
      'import/no-unresolved': 'off',
      'object-shorthand': 'error',
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
  },
];
