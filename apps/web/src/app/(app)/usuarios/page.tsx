import type { Metadata } from "next";
import { UsersScreen } from "@/components/users/users-screen";

export const metadata: Metadata = { title: "Usuários" };

export default function UsersPage() {
  return <UsersScreen />;
}
