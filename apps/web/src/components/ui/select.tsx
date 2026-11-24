"use client";

import { ChevronDown } from "lucide-react";
import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { controlClass, Field } from "@/components/ui/field";

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, label, hint, error, className, children, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <Field id={selectId} label={label} hint={hint} error={error}>
      {({ id: fieldId, invalid, describedBy }) => (
        <div className="relative">
          <select
            id={fieldId}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(controlClass, "appearance-none pr-10", invalid && "border-danger", className)}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
        </div>
      )}
    </Field>
  );
});
