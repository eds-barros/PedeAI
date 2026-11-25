/** @type {import('jest').Config} */
// Gate de 70% em apps/api: src/modules/{auth,empresas,usuarios,papeis} e src/common/tenant.
// Os caminhos são relativos ao pacote (o CI roda com working-directory apps/api).
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/modules/auth/**/*.ts',
    'src/modules/empresas/**/*.ts',
    'src/modules/usuarios/**/*.ts',
    'src/modules/papeis/**/*.ts',
    'src/common/tenant/**/*.ts',
    '!**/*.module.ts',
    '!**/*.dto.ts',
  ],
  coverageDirectory: './coverage',
  coverageThreshold: {
    'src/modules/auth/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    'src/modules/empresas/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    'src/modules/usuarios/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    'src/modules/papeis/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    'src/common/tenant/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
