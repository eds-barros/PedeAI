-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMIN', 'GERENTE', 'CAIXA', 'GARCOM', 'COZINHA');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('ABERTO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO', 'PAGO');

-- CreateEnum
CREATE TYPE "TipoPedido" AS ENUM ('BALCAO', 'MESA', 'DELIVERY');

-- CreateEnum
CREATE TYPE "StatusCaixa" AS ENUM ('ABERTO', 'FECHADO');

-- CreateEnum
CREATE TYPE "TipoMovimentoCaixa" AS ENUM ('VENDA', 'SANGRIA', 'SUPRIMENTO');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'PIX', 'CREDITO', 'DEBITO');

-- CreateTable
CREATE TABLE "empresas" (
    "id" UUID NOT NULL,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "logo_url" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultima_empresa_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_empresas" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "papel" "Papel" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "empresa_ativa_id" UUID NOT NULL,
    "revogada_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "sessao_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "access_jti" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "revogado_em" TIMESTAMP(3),
    "substituido_por_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_redefinicao_senha" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_redefinicao_senha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "categoria_id" UUID,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "usuario_id" UUID,
    "numero" INTEGER NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'ABERTO',
    "tipo" "TipoPedido" NOT NULL DEFAULT 'BALCAO',
    "observacao" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_pedido" (
    "id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "produto_id" UUID NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "observacao" TEXT,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "itens_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caixas" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "status" "StatusCaixa" NOT NULL DEFAULT 'ABERTO',
    "valor_abertura" DECIMAL(10,2) NOT NULL,
    "valor_fechamento" DECIMAL(10,2),
    "aberto_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechado_em" TIMESTAMP(3),
    "observacao" TEXT,

    CONSTRAINT "caixas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentos_caixa" (
    "id" UUID NOT NULL,
    "caixa_id" UUID NOT NULL,
    "pedido_id" UUID,
    "tipo" "TipoMovimentoCaixa" NOT NULL,
    "forma_pagamento" "FormaPagamento",
    "valor" DECIMAL(10,2) NOT NULL,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentos_caixa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_slug_key" ON "empresas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_empresas_empresa_id_idx" ON "usuarios_empresas"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_empresas_usuario_id_empresa_id_key" ON "usuarios_empresas"("usuario_id", "empresa_id");

-- CreateIndex
CREATE INDEX "sessoes_usuario_id_idx" ON "sessoes"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_sessao_id_idx" ON "refresh_tokens"("sessao_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuario_id_idx" ON "refresh_tokens"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_redefinicao_senha_token_hash_key" ON "tokens_redefinicao_senha"("token_hash");

-- CreateIndex
CREATE INDEX "tokens_redefinicao_senha_usuario_id_idx" ON "tokens_redefinicao_senha"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_empresa_id_nome_key" ON "categorias"("empresa_id", "nome");

-- CreateIndex
CREATE INDEX "produtos_empresa_id_idx" ON "produtos"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_empresa_id_nome_key" ON "produtos"("empresa_id", "nome");

-- CreateIndex
CREATE INDEX "pedidos_empresa_id_idx" ON "pedidos"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_empresa_id_numero_key" ON "pedidos"("empresa_id", "numero");

-- CreateIndex
CREATE INDEX "caixas_empresa_id_idx" ON "caixas"("empresa_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_ultima_empresa_id_fkey" FOREIGN KEY ("ultima_empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_empresas" ADD CONSTRAINT "usuarios_empresas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_empresas" ADD CONSTRAINT "usuarios_empresas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_empresa_ativa_id_fkey" FOREIGN KEY ("empresa_ativa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "sessoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_redefinicao_senha" ADD CONSTRAINT "tokens_redefinicao_senha_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixas" ADD CONSTRAINT "caixas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixas" ADD CONSTRAINT "caixas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_caixa" ADD CONSTRAINT "movimentos_caixa_caixa_id_fkey" FOREIGN KEY ("caixa_id") REFERENCES "caixas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_caixa" ADD CONSTRAINT "movimentos_caixa_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

