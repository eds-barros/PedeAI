import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";
import type { ApiErrorBody, ApiFieldError } from "@/lib/api/types";

export class ApiError extends Error {
  readonly statusCode: number;
  readonly errors?: ApiFieldError[];

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.statusCode = body.statusCode;
    this.errors = body.errors;
  }
}

export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): string | null {
  if (!(error instanceof ApiError)) {
    return "Não foi possível falar com o servidor. Tente de novo em instantes.";
  }

  let applied = 0;
  for (const item of error.errors ?? []) {
    if (!item.field || !item.message) continue;
    setError(item.field as FieldPath<T>, { type: "server", message: item.message });
    applied += 1;
  }

  return applied > 0 ? null : error.message;
}
