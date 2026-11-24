"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  BarChart3,
  BookOpen,
  ChefHat,
  ClipboardList,
  House,
  KeyRound,
  LogOut,
  Menu as MenuIcon,
  Monitor,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/badge";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/dropdown";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/cn";
import { canAccessPath, isNavActive, navItemsFor, ROLE_LABEL } from "@/lib/permissions";

const ICONS: Record<string, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  inicio: House,
  pdv: Monitor,
  kds: ChefHat,
  cardapio: BookOpen,
  pedidos: ClipboardList,
  relatorios: BarChart3,
  usuarios: Users,
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-sidebar md:flex md:flex-col">
        <SidebarBody />
      </aside>
      <MobileDrawer open={open} onOpenChange={setOpen} />
      <div className="flex min-h-dvh min-w-0 flex-col">
        <Header onOpenMenu={() => setOpen(true)} />
        <main id="conteudo" tabIndex={-1} className="flex-1 px-4 py-6 outline-none md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth();
  const pathname = usePathname();
  const items = role ? navItemsFor(role) : [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-4">
        <Link href="/" className="rounded-lg" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>
      <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 px-3">
        {items.map((item) => {
          const Icon = ICONS[item.id] ?? House;
          const active = isNavActive(item.href, pathname);
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                active ? "bg-nav-active text-nav-active-foreground" : "text-foreground hover:bg-surface-muted",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="px-4 py-4 text-xs text-muted">Praça · sprint 1</p>
    </div>
  );
}

function MobileDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#1f1a14]/50 md:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,18.5rem)] flex-col bg-sidebar shadow-card outline-none md:hidden">
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <Dialog.Description className="sr-only">Navegação principal da empresa ativa.</Dialog.Description>
          <button
            type="button"
            className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-lg"
            aria-label="Fechar menu"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          <SidebarBody onNavigate={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur md:px-6">
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-lg border border-border-strong md:hidden"
        aria-label="Abrir menu"
        onClick={onOpenMenu}
      >
        <MenuIcon className="size-4" aria-hidden="true" />
      </button>
      <CompanySwitcher />
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

function CompanySwitcher() {
  const { companies, activeCompanyId, role, selectCompany } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const current = companies.find((company) => company.id === activeCompanyId) ?? companies[0];

  if (!current || !role) return null;

  const summary = (
    <span className="min-w-0 text-left">
      <span className="block truncate text-sm font-semibold">{current.name}</span>
      <span className="block truncate text-xs text-muted">{ROLE_LABEL[role]}</span>
    </span>
  );

  if (companies.length < 2) {
    return <div className="min-w-0">{summary}</div>;
  }

  async function choose(companyId: string) {
    if (companyId === activeCompanyId || pending) return;
    setPending(true);
    try {
      const result = await selectCompany(companyId);
      const name = companies.find((company) => company.id === companyId)?.name ?? "Empresa";
      toast({ title: "Empresa alterada", description: name, variant: "success" });
      if (!canAccessPath(result.role, pathname)) router.replace("/");
      else router.refresh();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Não foi possível trocar de empresa.";
      toast({ title: "Troca não concluída", description: message, variant: "danger" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Menu>
      <MenuTrigger
        className="inline-flex min-w-0 max-w-[16rem] items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 py-1.5"
        aria-label="Trocar empresa ativa"
        disabled={pending}
      >
        {summary}
      </MenuTrigger>
      <MenuContent align="start" aria-label="Empresas">
        {companies.map((company) => (
          <MenuItem
            key={company.id}
            onSelect={() => {
              void choose(company.id);
            }}
            aria-current={company.id === activeCompanyId ? "true" : undefined}
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{company.name}</span>
              <span className="text-xs text-muted">{ROLE_LABEL[company.role]}</span>
            </span>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

function UserMenu() {
  const { user, role, companies, logout } = useAuth();
  if (!user || !role) return null;

  return (
    <Menu>
      <MenuTrigger className="inline-flex items-center gap-2 rounded-full py-1 pr-1 pl-1" aria-label="Menu da conta">
        <Avatar name={user.name} size="sm" />
        <span className="hidden max-w-32 truncate text-sm font-medium md:inline">{user.name}</span>
      </MenuTrigger>
      <MenuContent>
        <div className="px-3 py-2">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
          <div className="mt-2">
            <RoleBadge role={role} />
          </div>
        </div>
        <MenuSeparator />
        {companies.length > 1 ? (
          <MenuItem asChild>
            <Link href="/selecionar-empresa">Trocar empresa</Link>
          </MenuItem>
        ) : null}
        <MenuItem asChild>
          <Link href="/conta/senha" className="gap-2">
            <KeyRound className="size-4" aria-hidden="true" />
            Alterar senha
          </Link>
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          onSelect={() => {
            void logout();
          }}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sair
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
