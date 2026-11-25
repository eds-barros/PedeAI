import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Relatórios" };

export default function Page() {
  return <PlaceholderPage title="Relatórios" description="Movimento, ticket e desempenho da empresa ativa." />;
}
