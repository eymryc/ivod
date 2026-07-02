"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, BookOpen, Check, X, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { referencesApi } from "@/lib/api/references";
import { ApiError } from "@/lib/api/client";
import {
  AdminPageHeader,
  AdminPanel,
  AdminLoading,
  AdminEmpty,
} from "@/components/admin/AdminShell";
import { inputClsSm } from "@/lib/ui/cinema-field";

const RESOURCES = [
  { code: "content-types", label: "Types de contenu" },
  { code: "maturity-ratings", label: "Classifications d'âge" },
  { code: "user-plans", label: "Plans utilisateur" },
  { code: "payment-providers", label: "Fournisseurs paiement" },
  { code: "languages", label: "Langues" },
  { code: "countries", label: "Pays" },
  { code: "crew-roles", label: "Fonctions (équipe)" },
  { code: "award-types", label: "Types de distinction" },
  { code: "rightsholder-types", label: "Types ayant droit" },
  { code: "monetization-types", label: "Types monétisation" },
  { code: "territory-codes", label: "Codes territoire" },
  { code: "report-reasons", label: "Raisons de signalement" },
];

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

const RESOURCE_CODES = new Set(RESOURCES.map((r) => r.code));

export default function ReferencesPage() {
  const searchParams = useSearchParams();
  const resourceFromUrl = searchParams.get("resource") ?? "";
  const initialResource = RESOURCE_CODES.has(resourceFromUrl)
    ? resourceFromUrl
    : RESOURCES[0].code;

  const [resource, setResource] = useState(initialResource);
  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (RESOURCE_CODES.has(resourceFromUrl) && resourceFromUrl !== resource) {
      setResource(resourceFromUrl);
      setAdding(false);
      setEditingId(null);
    }
  }, [resourceFromUrl, resource]);

  const { data: items, isLoading } = useQuery({
    queryKey: ["references-resource", resource],
    queryFn: () => referencesApi.getResource(resource),
    staleTime: 5 * 60_000,
  });

  const invalidateResourceCaches = () => {
    qc.invalidateQueries({ queryKey: ["references-resource", resource] });
    qc.invalidateQueries({ queryKey: ["references"] });
    if (resource === "crew-roles") qc.invalidateQueries({ queryKey: ["crew-roles"] });
    if (resource === "award-types") qc.invalidateQueries({ queryKey: ["award-types"] });
    if (resource === "rightsholder-types") qc.invalidateQueries({ queryKey: ["references"] });
    if (resource === "monetization-types" || resource === "territory-codes") {
      qc.invalidateQueries({ queryKey: ["references"] });
    }
  };

  const createMutation = useMutation({
    mutationFn: () =>
      referencesApi.create(resource, { code: newCode.toUpperCase(), label: newLabel }),
    onSuccess: (data) => {
      showApiSuccess(data);
      invalidateResourceCaches();
      setAdding(false);
      setNewCode("");
      setNewLabel("");
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      referencesApi.update(resource, id, { label }),
    onSuccess: (data) => {
      showApiSuccess(data);
      invalidateResourceCaches();
      setEditingId(null);
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => referencesApi.remove(resource, id),
    onSuccess: (data) => {
      showApiSuccess(data);
      invalidateResourceCaches();
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const list: any[] = items ?? [];
  const activeResource = RESOURCES.find((r) => r.code === resource);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <AdminPageHeader
        title="Référentiels"
        subtitle="Données de référence de la plateforme — codes et libellés"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-52 shrink-0">
          <div className="rounded-none border border-white/[0.06] bg-white/[0.01] ring-1 ring-primary/[0.04] overflow-hidden p-2">
            <p className="px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-primary/50 font-medium">
              Ressources
            </p>
            <ul className="space-y-0.5">
              {RESOURCES.map((r) => (
                <li key={r.code}>
                  <button
                    type="button"
                    onClick={() => {
                      setResource(r.code);
                      setAdding(false);
                      setEditingId(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-none text-[12px] transition-colors ${
                      resource === r.code
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-white/45 hover:text-white/75 hover:bg-white/[0.03]"
                    }`}
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="flex-1 min-w-0">
          <AdminPanel
            title={activeResource?.label ?? resource}
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
                  className={`${inputClsSm} w-28 text-xs font-mono uppercase`}
                />
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Libellé"
                  autoFocus
                  className={`${inputClsSm} flex-1 w-full min-w-0 sm:min-w-[120px]`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCode && newLabel) createMutation.mutate();
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
            ) : list.length === 0 ? (
              <AdminEmpty icon={BookOpen} title="Aucune entrée." />
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {list.map((item: any) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-4 py-3 first:pt-0 last:pb-0 hover:bg-primary/[0.02] rounded-none px-1 -mx-1 transition-colors"
                  >
                    <span className="text-[11px] font-mono text-white/30 w-28 shrink-0 truncate">
                      {item.code}
                    </span>
                    <div className="flex-1 min-w-0">
                      {editingId === item.id ? (
                        <InlineEdit
                          value={item.label}
                          onSave={(label) => updateMutation.mutate({ id: item.id, label })}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <span className="text-[13px] text-white/80">{item.label}</span>
                      )}
                    </div>
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
                            if (confirm(`Supprimer "${item.label}" ?`)) deleteMutation.mutate(item.id);
                          }}
                          disabled={deleteMutation.isPending}
                          className="p-2 rounded-none text-white/35 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
      </div>
    </div>
  );
}
