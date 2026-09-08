import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['three', 'three/*', 'react', 'react-dom', '../ui/*', '../render/*', '../bots/*', '../app/*'],
          message: 'Core rules must be independent of rendering, UI, bots and application wiring.',
        }],
      }],
      'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'localStorage', 'indexedDB', 'requestAnimationFrame'],
      'no-restricted-properties': ['error', {
        object: 'Math', property: 'random', message: 'Draw from the serialized PRNG instead.',
      }],
    },
  },
);
