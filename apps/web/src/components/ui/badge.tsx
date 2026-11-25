import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { ROLE_LABEL, type Role } from "@/lib/permissions";

const tones = {
  neutral: "bg-surface-muted text-foreground",
  admin: "bg-[var(--badge-admin-bg)] text-[var(--badge-admin-fg)]",
  gerente: "bg-[var(--badge-gerente-bg)] text-[var(--badge-gerente-fg)]",
  caixa: "bg-[var(--badge-caixa-bg)] text-[var(--badge-caixa-fg)]",
  garcom: "bg-[var(--badge-garcom-bg)] text-[var(--badge-garcom-fg)]",
  cozinha: "bg-[var(--badge-cozinha-bg)] text-[var(--badge-cozinha-fg)]",
} as const;

type Tone = keyof typeof tones;

const roleTone: Record<Role, Tone> = {
  ADMIN: "admin",
  GERENTE: "gerente",
  CAIXA: "caixa",
  GARCOM: "garcom",
  COZINHA: "cozinha",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={roleTone[role]}>{ROLE_LABEL[role]}</Badge>;
}
