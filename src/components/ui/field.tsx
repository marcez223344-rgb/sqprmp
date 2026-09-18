import type { ReactNode } from "react";

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** Accessible form field: label, optional hint and error linked via aria-describedby. */
export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5" data-invalid={error ? "true" : undefined}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-muted text-sm">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
