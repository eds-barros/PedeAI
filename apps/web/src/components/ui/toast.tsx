"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ToastInput = {
  title: string;
  description?: string;
  variant?: "default" | "success" | "danger";
};

type ToastItem = ToastInput & { id: string; variant: NonNullable<ToastInput["variant"]> };

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((toast: ToastInput) => {
    const id = crypto.randomUUID();
    const item: ToastItem = { ...toast, id, variant: toast.variant ?? "default" };
    setToasts((current) => [...current, item]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== id));
    }, 5000);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            className={cn(
              "rounded-xl border border-border bg-surface p-4 text-foreground shadow-card",
              toast.variant === "danger" && "border-danger",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <ToastPrimitive.Title className="text-sm font-semibold">{toast.title}</ToastPrimitive.Title>
                {toast.description ? (
                  <ToastPrimitive.Description className="mt-1 text-sm text-muted">
                    {toast.description}
                  </ToastPrimitive.Description>
                ) : null}
              </div>
              <ToastPrimitive.Close className="rounded-md p-1" aria-label="Fechar aviso">
                <X className="size-4" aria-hidden="true" />
              </ToastPrimitive.Close>
            </div>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-[70] flex w-[min(100%-2rem,22rem)] flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
