import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      // NestJS uses empty constructors for DI
      'no-useless-constructor': 'off',
    },
  },
];
