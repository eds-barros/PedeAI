import { api } from "@/lib/api/client";
import type {
  CompanyUser,
  CreateUserInput,
  ListUsersQuery,
  Paginated,
  RoleGrant,
  UpdateUserInput,
} from "@/lib/api/types";

export function listUsers(query: ListUsersQuery, signal?: AbortSignal) {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);
  if (query.role) params.set("role", query.role);
  if (query.active) params.set("active", query.active);
  return api<Paginated<CompanyUser>>(`/users?${params.toString()}`, { signal });
}

export function getUser(id: string) {
  return api<CompanyUser>(`/users/${id}`);
}

export function createUser(input: CreateUserInput) {
  return api<CompanyUser>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateUser(id: string, input: UpdateUserInput) {
  return api<CompanyUser>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function setUserStatus(id: string, active: boolean) {
  return api<CompanyUser>(`/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}

export function listRoles() {
  return api<RoleGrant[]>("/roles");
}
