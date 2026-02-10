/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/libs'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    // Prisma Client
    '^@prisma/client$': '<rootDir>/generated/prisma-client',
    '^@prisma/client/(.*)$': '<rootDir>/generated/prisma-client/$1',
    // @app/* mappings
    '^@app/db$': '<rootDir>/generated/db',
    '^@app/db/(.*)$': '<rootDir>/generated/db/$1',
    '^@app/auth$': '<rootDir>/libs/domain/auth/src',
    '^@app/auth/(.*)$': '<rootDir>/libs/domain/auth/src/$1',
    '^@app/shared-db$': '<rootDir>/libs/infra/shared-db',
    '^@app/shared-db/(.*)$': '<rootDir>/libs/infra/shared-db/$1',
    '^@app/prisma$': '<rootDir>/libs/infra/prisma/prisma',
    '^@app/prisma/(.*)$': '<rootDir>/libs/infra/prisma/$1',
    '^@app/redis$': '<rootDir>/libs/infra/redis/src',
    '^@app/redis/(.*)$': '<rootDir>/libs/infra/redis/$1',
    '^@app/rabbitmq$': '<rootDir>/libs/infra/rabbitmq/src',
    '^@app/rabbitmq/(.*)$': '<rootDir>/libs/infra/rabbitmq/src/$1',
    '^@app/clients/internal/(.*)$': '<rootDir>/libs/infra/clients/internal/$1',
    '^@app/shared-services/(.*)$': '<rootDir>/libs/infra/shared-services/$1',
    // @/ mappings
    '^@/common/(.*)$': '<rootDir>/libs/infra/common/$1',
    '^@/config/(.*)$': '<rootDir>/libs/infra/common/config/$1',
    '^@/utils/(.*)$': '<rootDir>/libs/infra/utils/$1',
    '^@/prisma/(.*)$': '<rootDir>/libs/infra/prisma/prisma/$1',
    // Monorepo packages
    '^@repo/utils$': '<rootDir>/../../packages/utils',
    '^@repo/utils/(.*)$': '<rootDir>/../../packages/utils/$1',
    '^@repo/constants$': '<rootDir>/../../packages/constants/src',
    '^@repo/validators$': '<rootDir>/../../packages/validators/src',
    '^@repo/contracts$': '<rootDir>/../../packages/contracts/src',
    '^@repo/contracts/(.*)$': '<rootDir>/../../packages/contracts/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    'libs/**/*.ts',
    '!src/**/*.d.ts',
    '!libs/**/*.d.ts',
    '!src/**/index.ts',
    '!libs/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
};
