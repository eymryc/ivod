import type { FieldError, FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod/v3";

function setPathError(errors: FieldErrors, path: (string | number)[], error: FieldError): void {
  if (path.length === 0) return;
  let cursor: FieldErrors = errors;
  for (let i = 0; i < path.length - 1; i++) {
    const key = String(path[i]);
    cursor[key] ??= {};
    cursor = cursor[key] as FieldErrors;
  }
  const leaf = String(path[path.length - 1]);
  if (!cursor[leaf]) cursor[leaf] = error;
}

/** Resolver Zod v3 sans dépendance à `zod/v4/core` (évite violation CSP `unsafe-eval`). */
export function zodResolver<T extends FieldValues>(schema: ZodType<T>): Resolver<T> {
  return (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const errors: FieldErrors<T> = {};
    for (const issue of result.error.issues) {
      setPathError(errors, issue.path, { type: issue.code, message: issue.message });
    }
    return { values: {} as never, errors };
  };
}
