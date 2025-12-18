module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  // Run tests serially to avoid SQLite database conflicts
  maxWorkers: 1,
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^jsdom$': '<rootDir>/tests/__mocks__/jsdom.ts',
    '^dompurify$': '<rootDir>/tests/__mocks__/dompurify.ts',
    '^@/db$': '<rootDir>/src/db/__mocks__/index.ts',
    '^../db$': '<rootDir>/src/db/__mocks__/index.ts',
    '^../../db$': '<rootDir>/src/db/__mocks__/index.ts',
    '^@/db/schema$': '<rootDir>/src/db/__mocks__/schema.ts',
    '^../db/schema$': '<rootDir>/src/db/__mocks__/schema.ts',
    '^../../db/schema$': '<rootDir>/src/db/__mocks__/schema.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  testTimeout: 10000,
  setupFiles: ['<rootDir>/tests/setup.ts'],
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
