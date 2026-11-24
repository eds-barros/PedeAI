import { execSync } from 'child_process';
import { config } from 'dotenv';
import path from 'path';
import { Client } from 'pg';

export default async function globalSetup(): Promise<void> {
  config({ path: path.resolve(process.cwd(), '.env.test') });
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL ausente para o e2e.');
  }

  const url = new URL(databaseUrl);
  const nomeBanco = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const admin = new URL(databaseUrl);
  admin.pathname = '/postgres';
  const cliente = new Client({ connectionString: admin.toString() });
  await cliente.connect();
  const existe = await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1', [nomeBanco]);
  if (existe.rowCount === 0) {
    await cliente.query(`CREATE DATABASE "${nomeBanco.replaceAll('"', '')}"`);
  }
  await cliente.end();

  execSync('npx prisma migrate reset --force', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
}
