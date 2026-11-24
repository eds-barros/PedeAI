import { execSync } from 'child_process';
import { Papel, PrismaClient } from '@prisma/client';
import { assertPodeRodarSeed } from '../../prisma/seed';
import { EMAILS, LANCHONETE, PIZZARIA } from './helpers';

describe('QA Sprint 1 — SEED (P0)', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('SEED-006 — aborta quando NODE_ENV=production', () => {
    expect(() => assertPodeRodarSeed('production')).toThrow('Seed abortado: NODE_ENV=production.');
    expect(() => assertPodeRodarSeed('development')).not.toThrow();
    expect(() => assertPodeRodarSeed('test')).not.toThrow();

    let texto = '';
    let falhou = false;
    try {
      execSync('npx prisma db seed', {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'production' },
        stdio: 'pipe',
        encoding: 'utf8',
      });
    } catch (erro) {
      falhou = true;
      const execErro = erro as { message?: string; stderr?: string; stdout?: string };
      texto = `${execErro.message ?? ''}\n${execErro.stderr ?? ''}\n${execErro.stdout ?? ''}`;
    }
    expect(falhou).toBe(true);
    expect(texto).toContain('Seed abortado: NODE_ENV=production.');
  });

  it('SEED-001/002/003/004/005 — roda duas vezes sem duplicar e materializa o cenário mínimo', async () => {
    const rodar = () =>
      execSync('npx prisma db seed', {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'development' },
        stdio: 'pipe',
        encoding: 'utf8',
      });

    rodar();
    const depois1 = await contar();
    rodar();
    const depois2 = await contar();

    expect(depois2).toEqual(depois1);
    expect(depois2.empresas).toBeGreaterThanOrEqual(2);
    const empresas = await prisma.empresa.findMany();
    const nomes = empresas.map((e) => e.nomeFantasia);
    expect(nomes.some((n) => /pizzaria/i.test(n))).toBe(true);
    expect(nomes.some((n) => /lanchonete/i.test(n))).toBe(true);

    const vinculosA = await prisma.usuarioEmpresa.findMany({ where: { empresaId: PIZZARIA, ativo: true } });
    const vinculosB = await prisma.usuarioEmpresa.findMany({ where: { empresaId: LANCHONETE, ativo: true } });
    const papeisA = new Set(vinculosA.map((v) => v.papel));
    const papeisB = new Set(vinculosB.map((v) => v.papel));
    for (const papel of [Papel.ADMIN, Papel.GERENTE, Papel.CAIXA, Papel.GARCOM, Papel.COZINHA]) {
      expect(papeisA.has(papel)).toBe(true);
      expect(papeisB.has(papel)).toBe(true);
    }

    const multi = await prisma.usuario.findUnique({
      where: { email: EMAILS.multi },
      include: { vinculos: true },
    });
    expect(multi).not.toBeNull();
    const mapa = new Map(multi!.vinculos.map((v) => [v.empresaId, v.papel]));
    expect(mapa.get(PIZZARIA)).toBe('GARCOM');
    expect(mapa.get(LANCHONETE)).toBe('GERENTE');
  });

  async function contar() {
    const [empresas, usuarios, vinculos] = await Promise.all([
      prisma.empresa.count(),
      prisma.usuario.count(),
      prisma.usuarioEmpresa.count(),
    ]);
    return { empresas, usuarios, vinculos };
  }
});
