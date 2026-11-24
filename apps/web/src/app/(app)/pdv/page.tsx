import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "PDV" };

export default function Page() {
  return <PlaceholderPage title="PDV" description="Frente de caixa para lançar pedidos, receber e fechar a conta." />;
}
