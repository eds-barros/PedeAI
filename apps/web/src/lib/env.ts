const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api/v1";

export const env = {
  /** Base da API já com `/api/v1`, sem barra no final. */
  apiUrl: rawApiUrl.replace(/\/$/, ""),
  mock: process.env.NEXT_PUBLIC_API_MOCK === "true",
};
