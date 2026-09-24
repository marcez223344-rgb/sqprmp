"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { limits } from "@/config/limits";
import { searchLearnersAction } from "@/lib/admin/actions";
import { cn } from "@/lib/utils/cn";

/** Long enough that a normal typist sends one request per word, short enough to feel instant. */
const SEARCH_DEBOUNCE_MS = 200;

export interface PickedLearner {
  id: string;
  alias: string | null;
  displayName: string | null;
  entitlement: string;
}

/**
 * Search-as-you-type picker over alias and display name (owner feedback item 21: the admin had to
 * type an alias from memory). The search runs in a server action that checks `authorize()` first
 * and returns at most `limits.admin.learnerPickerResults` rows, never an email.
 *
 * Accessibility: the ARIA 1.2 combobox pattern — the input owns a listbox, ArrowUp/ArrowDown move
 * the active option, Enter selects, Escape closes — so it is usable without a mouse and announces
 * the result count on every search.
 */
export function LearnerPicker({
  value,
  onChange,
  label,
  required = false,
}: {
  value: PickedLearner | null;
  onChange: (learner: PickedLearner | null) => void;
  label: string;
  required?: boolean;
}) {
  const t = useTranslations("admin.learnerPicker");
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedLearner[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  // Debounced in the event handler rather than in an effect: one request per pause in typing, and
  // a late response for an older term is discarded instead of overwriting a newer result.
  const search = (term: string) => {
    setQuery(term);
    if (timer.current) clearTimeout(timer.current);
    if (term.trim().length < limits.admin.learnerPickerMinChars) {
      setResults([]);
      setOpen(false);
      setBusy(false);
      return;
    }
    setBusy(true);
    const id = (requestId.current += 1);
    timer.current = setTimeout(async () => {
      const r = await searchLearnersAction(term.trim());
      if (id !== requestId.current) return;
      setBusy(false);
      setResults(r.ok ? r.data : []);
      setActive(0);
      setOpen(true);
    }, SEARCH_DEBOUNCE_MS);
  };

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const select = (learner: PickedLearner) => {
    onChange(learner);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  if (value) {
    return (
      <div>
        <span className="text-muted mb-1 block text-sm">{label}</span>
        <div className="border-border bg-surface-2 flex min-h-11 items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
          <span>
            <Check aria-hidden="true" className="text-success-ink mr-1 inline size-4" />@
            {value.alias ?? "—"}
            {value.displayName ? <span className="text-muted"> · {value.displayName}</span> : null}
          </span>
          <button
            type="button"
            className="text-primary focus-visible:outline-ring inline-flex min-h-9 items-center gap-1 rounded px-2 underline underline-offset-4 focus-visible:outline-2"
            onClick={() => {
              onChange(null);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
          >
            <X aria-hidden="true" className="size-4" />
            {t("change")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label htmlFor={inputId} className="text-muted mb-1 block text-sm">
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <input
          id={inputId}
          ref={inputRef}
          className="input pl-9"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results.length > 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          required={required}
          value={query}
          placeholder={t("placeholder")}
          onChange={(e) => search(e.target.value)}
          onKeyDown={(e) => {
            if (!open || results.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i - 1 + results.length) % results.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              select(results[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {busy ? (
          <Loader2
            aria-hidden="true"
            className="text-muted absolute top-1/2 right-3 size-4 -translate-y-1/2 motion-safe:animate-spin"
          />
        ) : null}
      </div>
      <p role="status" aria-live="polite" className="text-muted mt-1 text-xs">
        {query.trim().length < limits.admin.learnerPickerMinChars
          ? t("hint", { min: limits.admin.learnerPickerMinChars })
          : t("count", { count: results.length })}
      </p>
      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="border-border bg-surface absolute z-20 mt-1 w-full overflow-hidden rounded-md border shadow-md"
        >
          {results.map((r, i) => (
            <li
              key={r.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm",
                i === active ? "bg-surface-2" : undefined,
              )}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                select(r);
              }}
            >
              @{r.alias ?? "—"}
              {r.displayName ? <span className="text-muted"> · {r.displayName}</span> : null}
              <span className="text-muted"> · {t(`access.${r.entitlement}` as never)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
