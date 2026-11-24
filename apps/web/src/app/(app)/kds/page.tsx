import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "KDS" };

export default function Page() {
  return <PlaceholderPage title="KDS" description="Painel da cozinha para acompanhar e avançar os pedidos." />;
}
