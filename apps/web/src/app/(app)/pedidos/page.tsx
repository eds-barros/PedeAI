import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Pedidos" };

export default function Page() {
  return <PlaceholderPage title="Pedidos" description="Acompanhamento dos pedidos do salão e do balcão." />;
}
