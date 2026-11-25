"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { controlClass, Field } from "@/components/ui/field";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  canReveal?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, hint, error, canReveal = false, className, type = "text", ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const inputType = canReveal && visible ? "text" : type;

  return (
    <Field id={inputId} label={label} hint={hint} error={error}>
      {({ id: fieldId, invalid, describedBy }) => (
        <div className="relative">
          <input
            id={fieldId}
            type={inputType}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(controlClass, canReveal && "pr-12", invalid && "border-danger", className)}
            ref={ref}
            {...props}
          />
          {canReveal ? (
            <button
              type="button"
              className="absolute inset-y-1 right-1 inline-flex items-center rounded-md px-2 text-muted"
              aria-pressed={visible}
              aria-controls={fieldId}
              aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setVisible((current) => !current)}
            >
              {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          ) : null}
        </div>
      )}
    </Field>
  );
});
