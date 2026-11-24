import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Cardápio" };

export default function Page() {
  return <PlaceholderPage title="Cardápio" description="Produtos, preços e disponibilidade da empresa ativa." />;
}
