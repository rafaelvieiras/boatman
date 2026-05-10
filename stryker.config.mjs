/** @type {import('@stryker-mutator/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  mutate: [
    'src/generators/*.mjs',
    'src/installer/detector.mjs',
  ],
  reporters: ['json', 'progress'],
  jsonReporter: {
    fileName: 'reports/mutation/mutation.json',
  },
  vitest: {
    configFile: 'vitest.config.mjs',
  },
  timeoutMS: 60000,
};
