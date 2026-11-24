"use client";

import { useEffect, useState } from "react";
import { StatusDialog, UserFormDialog } from "@/components/users/user-dialogs";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, type Column } from "@/components/ui/table";
import { ApiError, listUsers, type CompanyUser, type PageMeta } from "@/lib/api";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageTarget, ROLE_LABEL, ROLES, type Role } from "@/lib/permissions";

export function UsersScreen() {
  const { role, user, companies, activeCompanyId } = useAuth();
  const company = companies.find((item) => item.id === activeCompanyId);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<CompanyUser[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusUser, setStatusUser] = useState<CompanyUser | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [trackedCompany, setTrackedCompany] = useState(activeCompanyId);
  if (trackedCompany !== activeCompanyId) {
    setTrackedCompany(activeCompanyId);
    setPage(1);
  }
  const requestKey = [page, pageSize, debounced, roleFilter, active, activeCompanyId, reloadKey].join("|");
  const [trackedRequest, setTrackedRequest] = useState(requestKey);
  if (trackedRequest !== requestKey) {
    setTrackedRequest(requestKey);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!role) return;
    const controller = new AbortController();
    listUsers(
      { page, pageSize, search: debounced, role: roleFilter, active },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setRows(result.data);
        setMeta(result.meta);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setError(caught instanceof ApiError ? caught.message : "Não foi possível carregar os usuários.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [active, activeCompanyId, debounced, page, pageSize, reloadKey, role, roleFilter]);

  if (!role || !user) return null;

  const columns: Column<CompanyUser>[] = [
    { key: "name", header: "Nome", cell: (row) => row.name },
    { key: "email", header: "E-mail", cell: (row) => row.email },
    { key: "role", header: "Papel", cell: (row) => <RoleBadge role={row.role} /> },
    {
      key: "active",
      header: "Situação",
      cell: (row) => (row.active ? "Ativo" : "Inativo"),
    },
    {
      key: "actions",
      header: "Ações",
      mobile: "stack",
      cell: (row) => {
        const allowed = canManageTarget(role, row.role);
        const self = row.id === user.id;
        const reason = !allowed
          ? "Somente administradores alteram outro administrador."
          : self && row.active
            ? "Você não pode desativar a própria conta."
            : undefined;
        return (
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={!allowed} onClick={() => setEditingId(row.id)}>
              Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant={row.active ? "danger" : "secondary"}
              disabled={!allowed || (self && row.active)}
              title={reason}
              onClick={() => setStatusUser(row)}
            >
              {row.active ? "Desativar" : "Reativar"}
            </Button>
          </div>
        );
      },
    },
  ];

  const from = meta && meta.total > 0 ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const to = meta ? Math.min(meta.page * meta.pageSize, meta.total) : 0;

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Usuários</h1>
          <p className="mt-2 text-sm text-muted">Pessoas com acesso a {company?.name ?? "esta empresa"}.</p>
        </div>
        <Button type="button" onClick={() => setCreating(true)}>
          Novo usuário
        </Button>
      </div>

      <form
        role="search"
        className="grid gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]"
        onSubmit={(event) => event.preventDefault()}
      >
        <Input
          label="Buscar"
          placeholder="Nome ou e-mail"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          label="Papel"
          value={roleFilter}
          onChange={(event) => {
            setRoleFilter(event.target.value as Role | "");
            setPage(1);
          }}
        >
          <option value="">Todos</option>
          {ROLES.map((item) => (
            <option key={item} value={item}>
              {ROLE_LABEL[item]}
            </option>
          ))}
        </Select>
        <Select
          label="Situação"
          value={active}
          onChange={(event) => {
            setActive(event.target.value as "" | "true" | "false");
            setPage(1);
          }}
        >
          <option value="">Todas</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </Select>
      </form>

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div aria-busy={loading || undefined}>
        {loading && rows.length === 0 ? (
          <p role="status" className="text-sm text-muted">
            Carregando usuários…
          </p>
        ) : (
          <Table
            columns={columns}
            data={rows}
            rowKey={(row) => row.id}
            caption="Usuários da empresa ativa"
            empty="Nenhum usuário encontrado com esses filtros."
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" role="status">
          {meta ? `Mostrando ${from}–${to} de ${meta.total}` : "—"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Por página</span>
            <select
              className="h-9 rounded-lg border border-border-strong bg-surface px-2"
              value={pageSize}
              onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <nav aria-label="Paginação" className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Anterior
            </Button>
            <span className="text-sm">
              Página {meta?.page ?? page} de {meta?.totalPages ?? 1}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!meta || page >= meta.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </Button>
          </nav>
        </div>
      </div>

      <UserFormDialog
        open={creating}
        mode="create"
        actorRole={role}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          setPage(1);
          setReloadKey((current) => current + 1);
        }}
      />
      <UserFormDialog
        open={Boolean(editingId)}
        mode="edit"
        userId={editingId ?? undefined}
        actorRole={role}
        onClose={() => setEditingId(null)}
        onSaved={() => {
          setEditingId(null);
          setReloadKey((current) => current + 1);
        }}
      />
      <StatusDialog
        user={statusUser}
        onClose={() => setStatusUser(null)}
        onSaved={() => {
          setStatusUser(null);
          setReloadKey((current) => current + 1);
        }}
      />
    </section>
  );
}
