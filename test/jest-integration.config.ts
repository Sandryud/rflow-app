import type { Config } from 'jest';

const config: Config = {
  rootDir: '..',
  displayName: 'integration',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/integration/**/*.integration-spec.ts'],
  globalSetup: '<rootDir>/test/integration/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/integration/setup/global-teardown.ts',
  setupFiles: ['<rootDir>/test/integration/setup/worker-setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup/jest-hooks.ts'],
  maxWorkers: process.env.CI ? 2 : '50%',
  maxConcurrency: 1,
  testTimeout: 30_000,
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^generated/(.*)$': '<rootDir>/generated/$1',
  },
};

export default config;
