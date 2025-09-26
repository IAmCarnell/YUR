/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@agent-framework/(.*)$': '<rootDir>/agent-framework/$1',
    '^@yur-os/(.*)$': '<rootDir>/yur-os/$1',
    '^@plugins/(.*)$': '<rootDir>/plugins/$1'
  },
  collectCoverageFrom: [
    'agent-framework/**/*.{ts,tsx}',
    'yur-os/**/*.{ts,tsx}',
    'plugins/**/*.{ts,tsx}',
    'core/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!tests/**'
  ],
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  testMatch: [
    '<rootDir>/tests/**/*.{test,spec}.{ts,tsx}'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: false,
      isolatedModules: true
    }]
  },
  testTimeout: 30000,
  maxWorkers: '50%'
};