import type { Role } from "@/lib/permissions";
import { LANCHONETE_ID, PIZZARIA_ID } from "@/mocks/demo-accounts";

export type Company = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  razaoSocial: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
};
export type DbUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  ultimaEmpresaId?: string | null;
};
export type Membership = {
  userId: string;
  companyId: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export const companies: Company[] = [
  {
    id: PIZZARIA_ID,
    name: "Pizzaria Bella Napoli",
    slug: "pizzaria-bella-napoli",
    logoUrl: null,
    razaoSocial: "Pizzaria Bella Napoli Ltda",
    cnpj: "11222333000181",
    telefone: "1133334444",
    email: "contato@pizzaria.local",
    endereco: "Rua das Pizzas, 100, São Paulo",
  },
  {
    id: LANCHONETE_ID,
    name: "Lanchonete do Zé",
    slug: "lanchonete-do-ze",
    logoUrl: null,
    razaoSocial: "Lanchonete do Zé Ltda",
    cnpj: "22333444000192",
    telefone: "1144445555",
    email: "contato@lanchonete.local",
    endereco: "Avenida dos Lanches, 50, São Paulo",
  },
];

export const users: DbUser[] = [];
export const memberships: Membership[] = [];

function addUser(user: DbUser, links: Array<Omit<Membership, "userId" | "createdAt" | "updatedAt">>) {
  users.push(user);
  const now = "2026-01-15T12:00:00.000Z";
  for (const link of links) {
    memberships.push({ userId: user.id, createdAt: now, updatedAt: now, ...link });
  }
}

const STAFF: Array<[string, string, string, string, string, Role]> = [
  ["11111111-1111-4111-8111-000000000001", "Admin Pizzaria", "admin.pizzaria@pedeai.local", "PizzariaAdmin1", PIZZARIA_ID, "ADMIN"],
  ["11111111-1111-4111-8111-000000000002", "Gerente Pizzaria", "gerente.pizzaria@pedeai.local", "PizzariaGerente1", PIZZARIA_ID, "GERENTE"],
  ["11111111-1111-4111-8111-000000000003", "Caixa Pizzaria", "caixa.pizzaria@pedeai.local", "PizzariaCaixa1", PIZZARIA_ID, "CAIXA"],
  ["11111111-1111-4111-8111-000000000004", "Garçom Pizzaria", "garcom.pizzaria@pedeai.local", "PizzariaGarcom1", PIZZARIA_ID, "GARCOM"],
  ["11111111-1111-4111-8111-000000000005", "Cozinha Pizzaria", "cozinha.pizzaria@pedeai.local", "PizzariaCozinha1", PIZZARIA_ID, "COZINHA"],
  ["22222222-2222-4222-8222-000000000001", "Admin Lanchonete", "admin.lanchonete@pedeai.local", "LanchoneteAdmin1", LANCHONETE_ID, "ADMIN"],
  ["22222222-2222-4222-8222-000000000002", "Gerente Lanchonete", "gerente.lanchonete@pedeai.local", "LanchoneteGerente1", LANCHONETE_ID, "GERENTE"],
  ["22222222-2222-4222-8222-000000000003", "Caixa Lanchonete", "caixa.lanchonete@pedeai.local", "LanchoneteCaixa1", LANCHONETE_ID, "CAIXA"],
  ["22222222-2222-4222-8222-000000000004", "Garçom Lanchonete", "garcom.lanchonete@pedeai.local", "LanchoneteGarcom1", LANCHONETE_ID, "GARCOM"],
  ["22222222-2222-4222-8222-000000000005", "Cozinha Lanchonete", "cozinha.lanchonete@pedeai.local", "LanchoneteCozinha1", LANCHONETE_ID, "COZINHA"],
];

export function seedDatabase() {
  users.splice(0, users.length);
  memberships.splice(0, memberships.length);
  for (const [id, name, email, password, companyId, role] of STAFF) {
    addUser({ id, name, email, password, ultimaEmpresaId: companyId }, [{ companyId, role, active: true }]);
  }
  addUser(
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Usuário Multiempresa",
      email: "multi@pedeai.local",
      password: "MultiEmpresa1",
      ultimaEmpresaId: PIZZARIA_ID,
    },
    [
      { companyId: PIZZARIA_ID, role: "GARCOM", active: true },
      { companyId: LANCHONETE_ID, role: "GERENTE", active: true },
    ],
  );
}

seedDatabase();
