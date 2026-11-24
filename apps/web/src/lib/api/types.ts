import type { Role } from "@/lib/permissions";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
};

export type CompanyMembership = {
  id: string;
  name: string;
  role: Role;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
  companies: CompanyMembership[];
  activeCompanyId: string | null;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

export type SwitchCompanyResponse = {
  accessToken: string;
  refreshToken: string;
  activeCompanyId: string;
  role: Role;
};

export type MeResponse = {
  user: UserProfile;
  companies: CompanyMembership[];
  activeCompanyId: string | null;
  role: Role | null;
};

export type CompanyUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  data: T[];
  meta: PageMeta;
};

export type ListUsersQuery = {
  page: number;
  pageSize: number;
  search?: string;
  role?: Role | "";
  active?: "" | "true" | "false";
};

export type ApiFieldError = {
  field: string;
  message: string;
};

export type ApiErrorBody = {
  statusCode: number;
  message: string;
  errors?: ApiFieldError[];
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

export type UpdateUserInput = {
  name: string;
  email: string;
  role: Role;
};
