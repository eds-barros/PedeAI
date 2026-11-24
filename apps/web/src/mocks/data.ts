import type { Role } from "@/lib/permissions";
import { DEMO_PASSWORD } from "@/mocks/demo-accounts";

export type Company = { id: string; name: string };
export type DbUser = { id: string; name: string; email: string; password: string };
export type Membership = { userId: string; companyId: string; role: Role; active: boolean };

export const companies: Company[] = [
  { id: "cmp_praca", name: "Padaria da Praça" },
  { id: "cmp_central", name: "Lanchonete Central" },
  { id: "cmp_beco", name: "Burger do Beco" },
];

export const users: DbUser[] = [];
export const memberships: Membership[] = [];

function addUser(user: DbUser, links: Array<Omit<Membership, "userId">>) {
  users.push(user);
  for (const link of links) memberships.push({ userId: user.id, ...link });
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
    { id: "usr_ana", name: "Ana Silva", email: "ana.silva@pedeai.dev", password: DEMO_PASSWORD },
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
