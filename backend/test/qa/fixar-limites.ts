/**
 * Tetos de produto do login, fixados depois do `.env.test`.
 * O 429 com Retry-After depende destes valores, não dos tetos folgados de desenvolvimento.
 * process.env tem precedência sobre o arquivo no ConfigModule.
 */
process.env.LOGIN_MAX_FALHAS_EMAIL = '5';
process.env.LOGIN_MAX_FALHAS_IP = '20';
process.env.LOGIN_JANELA_MIN = '15';
