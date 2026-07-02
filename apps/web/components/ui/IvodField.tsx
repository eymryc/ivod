"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import clsx from "clsx";
import { Check, ChevronDown, Search } from "lucide-react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import {
  IVOD_FIELD_LABEL,
  IVOD_INPUT,
  IVOD_INPUT_SM,
  IVOD_NATIVE_SELECT,
  IVOD_NATIVE_SELECT_SM,
  IVOD_NATIVE_SELECT_WRAP,
  IVOD_SELECT_TRIGGER,
  IVOD_SELECT_TRIGGER_SM,
  IVOD_TEXTAREA,
} from "@/lib/ui/cinema-field";

export type IvodSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

/** Préfixe option vide + liste (listes longues / API). */
export function buildSelectOptions(
  items: IvodSelectOption[],
  emptyOption?: IvodSelectOption,
): IvodSelectOption[] {
  return emptyOption ? [emptyOption, ...items] : items;
}

type FieldShellProps = {
  label?: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
};

export function IvodFieldShell({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={clsx("min-w-0", className)}>
      {(label || hint) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={htmlFor} className={IVOD_FIELD_LABEL}>
              {label}
            </label>
          )}
          {hint}
        </div>
      )}
      {children}
      {error && <p className="mt-1.5 text-[11px] font-light text-red-400/90">{error}</p>}
    </div>
  );
}

type IvodInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: string;
  hint?: ReactNode;
  error?: string;
  shellClassName?: string;
  size?: "md" | "sm";
};

export function IvodInput({
  label,
  hint,
  error,
  shellClassName,
  size = "md",
  className,
  id: idProp,
  ...props
}: IvodInputProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <IvodFieldShell label={label} htmlFor={id} hint={hint} error={error} className={shellClassName}>
      <input
        id={id}
        className={clsx(size === "sm" ? IVOD_INPUT_SM : IVOD_INPUT, className)}
        {...props}
      />
    </IvodFieldShell>
  );
}

type IvodTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: ReactNode;
  error?: string;
  shellClassName?: string;
};

export function IvodTextarea({
  label,
  hint,
  error,
  shellClassName,
  className,
  id: idProp,
  ...props
}: IvodTextareaProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <IvodFieldShell label={label} htmlFor={id} hint={hint} error={error} className={shellClassName}>
      <textarea id={id} className={clsx(IVOD_TEXTAREA, className)} {...props} />
    </IvodFieldShell>
  );
}

type IvodNativeSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  label?: string;
  hint?: ReactNode;
  error?: string;
  shellClassName?: string;
  size?: "md" | "sm";
};

/** Select natif stylisé (chevron custom) — admin / cas simples. */
export function IvodNativeSelect({
  label,
  hint,
  error,
  shellClassName,
  size = "md",
  className,
  children,
  id: idProp,
  ...props
}: IvodNativeSelectProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <IvodFieldShell label={label} htmlFor={id} hint={hint} error={error} className={shellClassName}>
      <div className={IVOD_NATIVE_SELECT_WRAP}>
        <select
          id={id}
          className={clsx(size === "sm" ? IVOD_NATIVE_SELECT_SM : IVOD_NATIVE_SELECT, className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="ivod-native-select-chevron pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/35"
          aria-hidden
        />
      </div>
    </IvodFieldShell>
  );
}

type IvodSelectProps = {
  id?: string;
  label?: string;
  hint?: ReactNode;
  error?: string;
  shellClassName?: string;
  value: string;
  onChange: (value: string) => void;
  options: IvodSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  size?: "md" | "sm";
  className?: string;
};

/** Select custom type Select2 — dropdown, recherche optionnelle. */
export function IvodSelect({
  id: idProp,
  label,
  hint,
  error,
  shellClassName,
  value,
  onChange,
  options,
  placeholder = "Choisir…",
  disabled,
  searchable,
  size = "md",
  className,
}: IvodSelectProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = options.find((o) => o.value === value);
  const enableSearch = searchable ?? options.length >= 6;

  const filtered = useMemo(() => {
    if (!enableSearch || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.hint?.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q),
    );
  }, [options, query, enableSearch]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHighlight(0);
  }, []);

  const pick = useCallback(
    (next: string) => {
      onChange(next);
      close();
    },
    [onChange, close],
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close]);

  useEffect(() => {
    if (open && enableSearch) searchRef.current?.focus();
  }, [open, enableSearch]);

  useEffect(() => {
    if (highlight >= filtered.length) setHighlight(0);
  }, [filtered.length, highlight]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % Math.max(filtered.length, 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + filtered.length) % Math.max(filtered.length, 1));
    }
    if (e.key === "Enter" && filtered[highlight]) {
      e.preventDefault();
      pick(filtered[highlight].value);
    }
  };

  return (
    <IvodFieldShell label={label} htmlFor={id} hint={hint} error={error} className={shellClassName}>
      <div ref={rootRef} className={clsx("ivod-select relative", className)}>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          onKeyDown={onKeyDown}
          className={clsx(
            size === "sm" ? IVOD_SELECT_TRIGGER_SM : IVOD_SELECT_TRIGGER,
            open && "border-brand-magenta/45 shadow-[0_0_0_1px_rgba(230,0,126,0.12)]",
          )}
        >
          <span className={clsx("min-w-0 truncate", !selected && "text-white/35")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown
            size={16}
            className={clsx(
              "shrink-0 text-white/35 transition-transform duration-200",
              open && "rotate-180 text-brand-magenta/70",
            )}
            aria-hidden
          />
        </button>

        {open && (
          <div className="ivod-select-dropdown absolute z-50 mt-1.5 w-full overflow-hidden border border-white/[0.1] bg-[#060c16]/98 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85)] backdrop-blur-md">
            {enableSearch && (
              <div className="border-b border-white/[0.06] p-2">
                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                  />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Rechercher…"
                    className="ivod-btn w-full py-2 pl-9 pr-3 bg-black/30 border border-white/[0.08] text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-brand-magenta/35"
                  />
                </div>
              </div>
            )}
            <ul role="listbox" className="max-h-56 overflow-y-auto py-1 scrollbar-none">
              {filtered.length === 0 ? (
                <li className="px-3 py-2.5 text-[13px] text-white/35">Aucun résultat</li>
              ) : (
                filtered.map((opt, i) => {
                  const isSelected = opt.value === value;
                  const isActive = i === highlight;
                  return (
                    <li key={opt.value} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => pick(opt.value)}
                        className={clsx(
                          "ivod-select-option flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] transition-colors",
                          isActive && "bg-brand-magenta/10 text-white",
                          isSelected && !isActive && "bg-white/[0.04] text-white",
                          !isActive && !isSelected && "text-white/75 hover:bg-white/[0.05]",
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">{opt.label}</span>
                        {opt.hint && (
                          <span className="shrink-0 text-[11px] text-white/35">{opt.hint}</span>
                        )}
                        {isSelected && (
                          <Check size={14} className="shrink-0 text-brand-magenta" strokeWidth={2.5} />
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </IvodFieldShell>
  );
}

export type IvodSelectControlProps<T extends FieldValues> = Omit<
  IvodSelectProps,
  "value" | "onChange"
> & {
  control: Control<T>;
  name: FieldPath<T>;
};

/** IvodSelect branché sur react-hook-form. */
export function IvodSelectControl<T extends FieldValues>({
  control,
  name,
  error,
  ...props
}: IvodSelectControlProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <IvodSelect
          {...props}
          value={field.value == null ? "" : String(field.value)}
          onChange={field.onChange}
          error={error ?? fieldState.error?.message}
        />
      )}
    />
  );
}
