"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { forwardRef, useEffect, useState, type FormEvent, type SelectHTMLAttributes } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ApiError, applyFieldErrors, createUser, getUser, setUserStatus, updateUser, type CompanyUser } from "@/lib/api";
import { assignableRoles, ROLE_LABEL, type Role } from "@/lib/permissions";
import { createUserSchema, editUserSchema, type CreateUserValues, type EditUserValues } from "@/lib/validation";

export function UserFormDialog({
  open,
  mode,
  userId,
  actorRole,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  userId?: string;
  actorRole: Role;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const roles = assignableRoles(actorRole);
  const creating = mode === "create";
  const defaultRole = roles.includes("CAIXA") ? "CAIXA" : (roles[0] ?? "CAIXA");

  const createForm = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", password: "", role: "CAIXA" },
  });
  const editForm = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: "", email: "", role: "CAIXA" },
  });
  const resetCreate = createForm.reset;
  const resetEdit = editForm.reset;
  const setEditError = editForm.setError;
  const formSession = `${open}:${creating}:${userId ?? ""}:${defaultRole}`;
  const [seenSession, setSeenSession] = useState(formSession);
  if (seenSession !== formSession) {
    setSeenSession(formSession);
    setFormError(null);
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    if (creating) {
      resetCreate({ name: "", email: "", password: "", role: defaultRole });
      return;
    }
    if (!userId) return;
    getUser(userId)
      .then((user) => {
        if (cancelled) return;
        resetEdit({ name: user.name, email: user.email, role: user.role });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = applyFieldErrors(error, setEditError);
        setFormError(message ?? "Não foi possível carregar o usuário.");
      });
    return () => {
      cancelled = true;
    };
  }, [creating, defaultRole, open, resetCreate, resetEdit, setEditError, userId]);

  async function submitCreate(values: CreateUserValues) {
    setFormError(null);
    try {
      await createUser(values);
      toast({ title: "Usuário criado", description: values.name, variant: "success" });
      onSaved();
    } catch (error) {
      setFormError(applyFieldErrors(error, createForm.setError));
    }
  }

  async function submitEdit(values: EditUserValues) {
    if (!userId) return;
    setFormError(null);
    try {
      await updateUser(userId, values);
      toast({ title: "Usuário atualizado", description: values.name, variant: "success" });
      onSaved();
    } catch (error) {
      setFormError(applyFieldErrors(error, editForm.setError));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={creating ? "Novo usuário" : "Editar usuário"}
      description={
        creating
          ? "A pessoa entra nesta empresa com o papel escolhido."
          : "As alterações valem para a empresa ativa."
      }
    >
      {creating ? (
        <form className="grid gap-4" onSubmit={createForm.handleSubmit(submitCreate)} noValidate>
          <FormAlert message={formError} />
          <Input label="Nome" autoComplete="name" error={createForm.formState.errors.name?.message} {...createForm.register("name")} />
          <Input label="E-mail" type="email" autoComplete="off" error={createForm.formState.errors.email?.message} {...createForm.register("email")} />
          <Input
            label="Senha inicial"
            type="password"
            autoComplete="new-password"
            canReveal
            hint="Mínimo de 8 caracteres."
            error={createForm.formState.errors.password?.message}
            {...createForm.register("password")}
          />
          <RoleSelect
            error={createForm.formState.errors.role?.message}
            roles={roles}
            {...createForm.register("role")}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={createForm.formState.isSubmitting}>
              {createForm.formState.isSubmitting ? "Salvando…" : "Criar usuário"}
            </Button>
          </div>
        </form>
      ) : (
        <form className="grid gap-4" onSubmit={editForm.handleSubmit(submitEdit)} noValidate>
          <FormAlert message={formError} />
          <Input label="Nome" autoComplete="name" error={editForm.formState.errors.name?.message} {...editForm.register("name")} />
          <Input label="E-mail" type="email" autoComplete="off" error={editForm.formState.errors.email?.message} {...editForm.register("email")} />
          <RoleSelect error={editForm.formState.errors.role?.message} roles={roles} {...editForm.register("role")} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={editForm.formState.isSubmitting}>
              {editForm.formState.isSubmitting ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

const RoleSelect = forwardRef<
  HTMLSelectElement,
  { roles: Role[]; error?: string } & SelectHTMLAttributes<HTMLSelectElement>
>(function RoleSelect({ roles, error, ...props }, ref) {
  return (
    <Select ref={ref} label="Papel nesta empresa" error={error} {...props}>
      {roles.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABEL[role]}
        </option>
      ))}
    </Select>
  );
});

export function StatusDialog({
  user,
  onClose,
  onSaved,
}: {
  user: CompanyUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const activating = user ? !user.active : false;
  const identity = user ? `${user.id}:${user.active}` : "closed";
  const [seenUser, setSeenUser] = useState(identity);
  if (seenUser !== identity) {
    setSeenUser(identity);
    setConfirmed(false);
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (!confirmed) {
      setError(activating ? "Confirme para reativar." : "Confirme para desativar.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await setUserStatus(user.id, !user.active);
      toast({
        title: activating ? "Usuário reativado" : "Usuário desativado",
        description: user.name,
        variant: "success",
      });
      onSaved();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível alterar a situação.");
      setPending(false);
    }
  }

  return (
    <Dialog
      open={Boolean(user)}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={activating ? "Reativar usuário" : "Desativar usuário"}
      description={
        user
          ? activating
            ? `${user.name} volta a acessar esta empresa.`
            : `${user.name} perde o acesso a esta empresa até ser reativado.`
          : undefined
      }
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <Checkbox
          label={activating ? "Confirmo a reativação desta conta." : "Confirmo a desativação desta conta."}
          checked={confirmed}
          error={error ?? undefined}
          onCheckedChange={(checked) => {
            setConfirmed(checked);
            setError(null);
          }}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant={activating ? "primary" : "danger"} loading={pending}>
            {pending ? "Salvando…" : activating ? "Reativar" : "Desativar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
