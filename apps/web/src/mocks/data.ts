import type { Role } from "@/lib/permissions";
import { DEMO_PASSWORD } from "@/mocks/demo-accounts";

export type Company = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  razaoSocial: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
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
    id: "cmp_praca",
    name: "Padaria da Praça",
    slug: "padaria-da-praca",
    logoUrl: null,
    razaoSocial: "Padaria da Praça Ltda.",
    cnpj: "12.345.678/0001-90",
    telefone: "(11) 3000-1000",
    email: "contato@padariadapraca.dev",
    endereco: "Praça Central, 10",
  },
  {
    id: "cmp_central",
    name: "Lanchonete Central",
    slug: "lanchonete-central",
    logoUrl: null,
    razaoSocial: "Lanchonete Central Ltda.",
    cnpj: "98.765.432/0001-10",
    telefone: "(11) 3000-2000",
    email: "contato@lanchonetecentral.dev",
    endereco: "Rua do Comércio, 200",
  },
  {
    id: "cmp_beco",
    name: "Burger do Beco",
    slug: "burger-do-beco",
    logoUrl: null,
    razaoSocial: "Burger do Beco Ltda.",
    cnpj: "11.222.333/0001-44",
    telefone: "(11) 3000-3000",
    email: "contato@burgerdobeco.dev",
    endereco: "Beco das Flores, 5",
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

const staff: Array<[string, string, Role, boolean]> = [
  ["Helena", "Barbosa", "CAIXA", true],
  ["Igor", "Cardoso", "GARCOM", true],
  ["Júlia", "Dias", "COZINHA", true],
  ["Kaio", "Freitas", "GERENTE", true],
  ["Lara", "Gomes", "CAIXA", false],
  ["Miguel", "Lima", "GARCOM", true],
  ["Nina", "Martins", "COZINHA", true],
  ["Otávio", "Nogueira", "CAIXA", true],
  ["Paula", "Pinto", "GARCOM", true],
  ["Rafael", "Ramos", "COZINHA", true],
  ["Sara", "Teixeira", "GERENTE", true],
  ["Tiago", "Vieira", "CAIXA", true],
  ["Úrsula", "Barbosa", "GARCOM", false],
  ["Vitor", "Cardoso", "COZINHA", true],
  ["Wanda", "Dias", "CAIXA", true],
  ["Yasmin", "Freitas", "GARCOM", true],
  ["Caio", "Gomes", "COZINHA", true],
  ["Eduarda", "Lima", "CAIXA", true],
];

export function seedDatabase() {
  users.splice(0, users.length);
  memberships.splice(0, memberships.length);

  addUser(
    {
      id: "usr_ana",
      name: "Ana Silva",
      email: "ana.silva@pedeai.dev",
      password: DEMO_PASSWORD,
      ultimaEmpresaId: "cmp_praca",
    },
    [
      { companyId: "cmp_praca", role: "ADMIN", active: true },
      { companyId: "cmp_central", role: "GERENTE", active: true },
    ],
  );
  addUser(
    { id: "usr_bruno", name: "Bruno Costa", email: "bruno.costa@pedeai.dev", password: DEMO_PASSWORD },
    [{ companyId: "cmp_praca", role: "CAIXA", active: true }],
  );
  addUser(
    { id: "usr_carla", name: "Carla Mendes", email: "carla.mendes@pedeai.dev", password: DEMO_PASSWORD },
    [
      { companyId: "cmp_praca", role: "GERENTE", active: true },
      { companyId: "cmp_beco", role: "ADMIN", active: true },
    ],
  );
  addUser(
    { id: "usr_diego", name: "Diego Alves", email: "diego.alves@pedeai.dev", password: DEMO_PASSWORD },
    [
      { companyId: "cmp_praca", role: "GARCOM", active: true },
      { companyId: "cmp_beco", role: "GARCOM", active: true },
    ],
  );
  addUser(
    { id: "usr_elisa", name: "Elisa Rocha", email: "elisa.rocha@pedeai.dev", password: DEMO_PASSWORD },
    [
      { companyId: "cmp_praca", role: "COZINHA", active: true },
      { companyId: "cmp_central", role: "COZINHA", active: true },
    ],
  );
  addUser(
    { id: "usr_renata", name: "Renata Lopes", email: "renata.lopes@pedeai.dev", password: DEMO_PASSWORD },
    [{ companyId: "cmp_central", role: "CAIXA", active: true }],
  );
  addUser(
    { id: "usr_pedro", name: "Pedro Souza", email: "pedro.souza@pedeai.dev", password: DEMO_PASSWORD },
    [{ companyId: "cmp_central", role: "GARCOM", active: true }],
  );

  staff.forEach(([first, last, role, active], index) => {
    const email = `${first}.${last}`.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase() + "@pedeai.dev";
    addUser(
      { id: `usr_staff_${index + 1}`, name: `${first} ${last}`, email, password: DEMO_PASSWORD },
      [{ companyId: "cmp_praca", role, active }],
    );
  });
}

seedDatabase();
