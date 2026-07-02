"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X, Loader2, Tag } from "lucide-react";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { categoriesApi } from "@/lib/api/categories";
import { ApiError } from "@/lib/api/client";
import {
  AdminPageHeader,
  AdminPanel,
  AdminLoading,
  AdminEmpty,
} from "@/components/admin/AdminShell";
import { inputClsSm } from "@/lib/ui/cinema-field";

function InlineEdit({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(value);
  return (
    <div className="flex items-center gap-2">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        autoFocus
        className="flex-1 ivod-cinema-input h-9 px-3 border-primary/40 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(v);
          if (e.key === "Escape") onCancel();
        }}
      />
      <button
        type="button"
        onClick={() => onSave(v)}
        className="p-1.5 rounded-none text-emerald-400/90 hover:bg-emerald-500/10 transition-colors"
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="p-1.5 rounded-none text-white/35 hover:text-white hover:bg-white/[0.04] transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: categoriesApi.list,
    staleTime: 2 * 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
    qc.invalidateQueries({ queryKey: ["references"] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      categoriesApi.create({ code: newCode.toUpperCase(), label: newLabel }),
    onSuccess: (data) => {
      showApiSuccess(data);
      invalidate();
      setAdding(false);
      setNewCode("");
      setNewLabel("");
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      categoriesApi.update(id, { label }),
    onSuccess: (data) => {
      showApiSuccess(data);
      invalidate();
      setEditingId(null);
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: (data) => {
      showApiSuccess(data);
      invalidate();
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const list: any[] = items ?? [];

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
      <AdminPageHeader
        title="Catégories"
        subtitle="Genres de contenu — utilisés pour les filtres catalogue et la navigation"
      />

      <AdminPanel
        title={`${list.length} catégorie${list.length > 1 ? "s" : ""}`}
        action={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-[11px] font-medium border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
          >
            <Plus size={12} /> Ajouter
          </button>
        }
      >
        {adding && (
          <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-none border border-primary/20 bg-primary/[0.04]">
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="CODE"
              className={`${inputClsSm} w-32 text-xs font-mono uppercase`}
            />
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Libellé affiché"
              autoFocus
              className={`${inputClsSm} flex-1 min-w-[140px]`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCode && newLabel)
                  createMutation.mutate();
                if (e.key === "Escape") setAdding(false);
              }}
            />
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={!newCode || !newLabel || createMutation.isPending}
              className="p-2 rounded-none text-emerald-400/90 hover:bg-emerald-500/10 disabled:opacity-40 transition-colors"
            >
              {createMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="p-2 rounded-none text-white/35 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {isLoading ? (
          <AdminLoading className="py-12" />
        ) : list.length === 0 && !adding ? (
          <AdminEmpty icon={Tag} title="Aucune catégorie." />
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {list.map((item: any) => (
              <li
                key={item.id}
                className="flex items-center gap-4 py-3 first:pt-0 last:pb-0 hover:bg-primary/[0.02] rounded-none px-1 -mx-1 transition-colors"
              >
                <span className="text-[11px] font-mono text-white/30 w-32 shrink-0 truncate">
                  {item.code}
                </span>

                <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <InlineEdit
                      value={item.label}
                      onSave={(label) =>
                        updateMutation.mutate({ id: item.id, label })
                      }
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <span className="text-[13px] text-white/80">
                      {item.label}
                    </span>
                  )}
                </div>

                {item.slug && editingId !== item.id && (
                  <span className="hidden sm:block text-[11px] text-white/20 font-mono shrink-0">
                    /{item.slug}
                  </span>
                )}

                {!item.isActive && editingId !== item.id && (
                  <span className="text-[10px] px-2 py-0.5 border border-white/[0.08] text-white/25 shrink-0">
                    inactif
                  </span>
                )}

                {editingId !== item.id && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingId(item.id)}
                      className="p-2 rounded-none text-white/35 hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Supprimer la catégorie "${item.label}" ?`))
                          deleteMutation.mutate(item.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="p-2 rounded-none text-white/35 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  );
}
