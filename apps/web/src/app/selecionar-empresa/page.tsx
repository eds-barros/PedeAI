"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CompanyPicker } from "@/components/company/company-picker";
import { FullScreenStatus } from "@/components/status/full-screen-status";
import { useAuth } from "@/lib/auth/auth-context";

export default function SelectCompanyPage() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [router, status]);

  if (status !== "authenticated") return <FullScreenStatus label="Carregando empresas…" />;
  return <CompanyPicker />;
}
