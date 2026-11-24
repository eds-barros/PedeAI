export function validarAmbiente(config: Record<string, unknown>) {
  const databaseUrl = String(config.DATABASE_URL ?? '').trim();
  const segredo = String(config.JWT_ACCESS_SECRET ?? '').trim();
  const cors = String(config.CORS_ORIGIN ?? '').trim();
  if (!databaseUrl) {
    throw new Error('Variável de ambiente obrigatória ausente: DATABASE_URL');
  }
  if (segredo.length < 16) {
    throw new Error('JWT_ACCESS_SECRET deve ter ao menos 16 caracteres.');
  }
  if (!cors) {
    throw new Error('Variável de ambiente obrigatória ausente: CORS_ORIGIN');
  }
  return {
    ...config,
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: segredo,
    CORS_ORIGIN: cors,
    PORT: Number(config.PORT ?? 3000),
    JWT_ACCESS_TTL: String(config.JWT_ACCESS_TTL ?? '15m'),
    JWT_REFRESH_TTL_DAYS: Number(config.JWT_REFRESH_TTL_DAYS ?? 7),
    LOG_LEVEL: String(config.LOG_LEVEL ?? 'info'),
    APP_URL: String(config.APP_URL ?? 'http://localhost:3001'),
    NODE_ENV: String(config.NODE_ENV ?? 'development'),
  };
}
