/** Credenciais iguais ao seed da API (`apps/api/prisma/seed.ts`). */

export const DEMO_RESET_TOKEN = "demo-reset";

export const PIZZARIA_ID = "11111111-1111-4111-8111-111111111111";
export const LANCHONETE_ID = "22222222-2222-4222-8222-222222222222";

export const DEMO_ACCOUNTS = [
  {
    name: "Admin Pizzaria",
    email: "admin.pizzaria@pedeai.local",
    password: "PizzariaAdmin1",
    detail: "Administrador na Pizzaria Bella Napoli",
  },
  {
    name: "Gerente Pizzaria",
    email: "gerente.pizzaria@pedeai.local",
    password: "PizzariaGerente1",
    detail: "Gerente na Pizzaria Bella Napoli. Só consulta usuários",
  },
  {
    name: "Caixa Pizzaria",
    email: "caixa.pizzaria@pedeai.local",
    password: "PizzariaCaixa1",
    detail: "Caixa na Pizzaria Bella Napoli",
  },
  {
    name: "Garçom Pizzaria",
    email: "garcom.pizzaria@pedeai.local",
    password: "PizzariaGarcom1",
    detail: "Garçom na Pizzaria Bella Napoli",
  },
  {
    name: "Cozinha Pizzaria",
    email: "cozinha.pizzaria@pedeai.local",
    password: "PizzariaCozinha1",
    detail: "Cozinha na Pizzaria Bella Napoli",
  },
  {
    name: "Usuário Multiempresa",
    email: "multi@pedeai.local",
    password: "MultiEmpresa1",
    detail: "Garçom na pizzaria e gerente na Lanchonete do Zé",
  },
] as const;
