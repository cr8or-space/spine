import js from '@eslint/js';
import globals from 'globals';
import ts from 'typescript-eslint';

export const config = ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  }
);
