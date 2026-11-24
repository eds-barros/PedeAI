import { api } from "@/lib/api/client";
import type { CurrentCompany, UpdateCompanyInput } from "@/lib/api/types";

export function getCurrentCompany() {
  return api<CurrentCompany>("/companies/current");
}

export function updateCurrentCompany(input: UpdateCompanyInput) {
  return api<CurrentCompany>("/companies/current", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
