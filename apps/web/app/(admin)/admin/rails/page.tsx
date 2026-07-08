"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Film,
  GripVertical,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  User,
  Wand2,
  X,
} from "lucide-react";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import {
  catalogApi,
  type AdminCatalogRail,
  type CatalogRailQuery,
  type CatalogRailSurface,
} from "@/lib/api/catalog";
import { referencesApi } from "@/lib/api/references";
import {
  AdminPageHeader,
  AdminPrimaryButton,
  AdminLoading,
  AdminEmpty,
  AdminKpiCard,
  AdminPills,
  AdminPanel,
} from "@/components/admin/AdminShell";
import {
  RailContentPicker,
  type RailContentItem,
} from "@/components/admin/RailContentPicker";
import { inputClsSm as inputCls, labelCls } from "@/lib/ui/cinema-field";

const PLAN_CODES = ["FREE", "BASIC", "PREMIUM"];

/** Dérive un identifiant technique à partir d'un titre lisible (ex. "Sélection de juin" → "selection_de_juin"). */
function slugifyRailCode(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function TogglePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-[12px] font-medium border transition-colors ${
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-white/[0.08] text-white/45 hover:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

function RailTargetingFields({
  planCodes,
  onPlanCodesChange,
  countryCodes,
  onCountryCodesChange,
}: {
  planCodes: string[];
  onPlanCodesChange: (codes: string[]) => void;
  countryCodes: string;
  onCountryCodesChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3 border-t border-white/[0.06] pt-4">
      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/35">
        Ciblage (optionnel)
      </p>
      <div>
        <label className={labelCls}>Plans autorisés — aucun = tous les plans</label>
        <div className="flex gap-2 mt-1.5">
          {PLAN_CODES.map((code) => (
            <TogglePill
              key={code}
              active={planCodes.includes(code)}
              onClick={() =>
                onPlanCodesChange(
                  planCodes.includes(code)
                    ? planCodes.filter((c) => c !== code)
                    : [...planCodes, code],
                )
              }
            >
              {code}
            </TogglePill>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="rail-countries">
          Pays autorisés (codes ISO séparés par virgule) — vide = tous les pays
        </label>
        <input
          id="rail-countries"
          className={inputCls}
          placeholder="CI, SN, ML"
          value={countryCodes}
          onChange={(e) => onCountryCodesChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function RailQueryFields({
  query,
  onChange,
  contentTypes,
}: {
  query: CatalogRailQuery;
  onChange: (q: CatalogRailQuery) => void;
  contentTypes: { code: string; label: string }[];
}) {
  const set = (patch: Partial<CatalogRailQuery>) => onChange({ ...query, ...patch });
  return (
    <div className="space-y-3 border-t border-white/[0.06] pt-4">
      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/35">
        Critères du rail dynamique
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="q-contentType">
            Type de contenu
          </label>
          <select
            id="q-contentType"
            className={inputCls}
            value={query.contentType ?? ""}
            onChange={(e) => set({ contentType: e.target.value || undefined })}
          >
            <option value="">Tous</option>
            {contentTypes.map((ct) => (
              <option key={ct.code} value={ct.code}>
                {ct.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="q-genreCodes">
            Genres (codes séparés par virgule)
          </label>
          <input
            id="q-genreCodes"
            className={inputCls}
            placeholder="ACTION, DRAME"
            value={query.genreCodes?.join(", ") ?? ""}
            onChange={(e) =>
              set({
                genreCodes: e.target.value
                  .split(",")
                  .map((s) => s.trim().toUpperCase())
                  .filter(Boolean),
              })
            }
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="q-yearFrom">
            Année de sortie — de
          </label>
          <input
            id="q-yearFrom"
            type="number"
            className={inputCls}
            placeholder="1990"
            value={query.releaseYearFrom ?? ""}
            onChange={(e) =>
              set({ releaseYearFrom: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="q-yearTo">
            Année de sortie — à
          </label>
          <input
            id="q-yearTo"
            type="number"
            className={inputCls}
            placeholder="1999"
            value={query.releaseYearTo ?? ""}
            onChange={(e) =>
              set({ releaseYearTo: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="q-sort">
            Tri
          </label>
          <select
            id="q-sort"
            className={inputCls}
            value={query.sort ?? "publishedAt"}
            onChange={(e) => set({ sort: e.target.value })}
          >
            <option value="publishedAt">Plus récents</option>
            <option value="viewCount">Plus vus</option>
            <option value="averageRating">Mieux notés</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="q-limit">
            Nombre de titres max
          </label>
          <input
            id="q-limit"
            type="number"
            className={inputCls}
            placeholder="20"
            value={query.limit ?? ""}
            onChange={(e) => set({ limit: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="q-country">
            Pays d&apos;origine du contenu
          </label>
          <input
            id="q-country"
            className={inputCls}
            placeholder="CI"
            value={query.countryOfOrigin ?? ""}
            onChange={(e) => set({ countryOfOrigin: e.target.value || undefined })}
          />
        </div>
        <div className="flex items-end pb-1.5">
          <label className="flex items-center gap-2 text-[13px] text-white/60 cursor-pointer">
            <input
              type="checkbox"
              checked={query.isExclusive ?? false}
              onChange={(e) => set({ isExclusive: e.target.checked || undefined })}
            />
            Exclusifs iVOD uniquement
          </label>
        </div>
      </div>
    </div>
  );
}

const SURFACES: { code: CatalogRailSurface; label: string }[] = [
  { code: "home", label: "Accueil" },
  { code: "films", label: "Films" },
  { code: "series", label: "Séries" },
  { code: "web-series", label: "Web-séries" },
  { code: "animation", label: "Animation" },
];

const TYPE_UI: Record<string, { label: string; className: string; icon: typeof Layers }> = {
  personalized: {
    label: "Personnalisé",
    className: "border-primary/25 bg-primary/10 text-primary",
    icon: User,
  },
  query: {
    label: "Dynamique",
    className: "border-secondary/25 bg-secondary/10 text-secondary",
    icon: Wand2,
  },
  editorial: {
    label: "Éditorial",
    className: "border-amber-500/25 bg-amber-500/10 text-amber-300/90",
    icon: Sparkles,
  },
};

function RailTypeBadge({ type }: { type: string }) {
  const ui = TYPE_UI[type] ?? TYPE_UI.query;
  const Icon = ui.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide border ${ui.className}`}
    >
      <Icon size={10} strokeWidth={2} />
      {ui.label}
    </span>
  );
}

function RailEditModal({
  rail,
  editTitle,
  editContents,
  editQuery,
  editPlanCodes,
  editCountryCodes,
  contentTypes,
  onTitleChange,
  onContentsChange,
  onQueryChange,
  onPlanCodesChange,
  onCountryCodesChange,
  onClose,
  onSave,
  isSaving,
}: {
  rail: AdminCatalogRail;
  editTitle: string;
  editContents: RailContentItem[];
  editQuery: CatalogRailQuery;
  editPlanCodes: string[];
  editCountryCodes: string;
  contentTypes: { code: string; label: string }[];
  onTitleChange: (v: string) => void;
  onContentsChange: (items: RailContentItem[]) => void;
  onQueryChange: (q: CatalogRailQuery) => void;
  onPlanCodesChange: (codes: string[]) => void;
  onCountryCodesChange: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-none border border-white/[0.06] bg-[#0c0c14] ring-1 ring-primary/[0.06] shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#0c0c14] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-primary/60 mb-0.5">
              Rail catalogue
            </p>
            <h2 className="text-base font-semibold text-white tracking-tight">{rail.title}</h2>
            <p className="text-[11px] text-white/35 font-mono mt-0.5">{rail.code}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/30 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className={labelCls} htmlFor="edit-title">
              Titre viewer
            </label>
            <input
              id="edit-title"
              className={inputCls}
              value={editTitle}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>

          {rail.type === "editorial" ? (
            <RailContentPicker value={editContents} onChange={onContentsChange} />
          ) : rail.type === "query" ? (
            <RailQueryFields query={editQuery} onChange={onQueryChange} contentTypes={contentTypes} />
          ) : (
            <p className="text-[12px] text-white/40 font-light border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
              Ce rail est de type <strong className="text-white/65">{rail.type}</strong>. Seuls le
              titre, l&apos;activation et le ciblage sont modifiables ici.
            </p>
          )}

          <RailTargetingFields
            planCodes={editPlanCodes}
            onPlanCodesChange={onPlanCodesChange}
            countryCodes={editCountryCodes}
            onCountryCodesChange={onCountryCodesChange}
          />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-none border border-white/[0.08] text-[13px] text-white/50 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-none bg-primary text-white text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RailRow({
  rail,
  index,
  list,
  onEdit,
  onToggle,
  onReorder,
  onDragReorder,
  isReordering,
  dragIndex,
  dropIndex,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  rail: AdminCatalogRail;
  index: number;
  list: AdminCatalogRail[];
  onEdit: () => void;
  onToggle: () => void;
  onReorder: (dir: -1 | 1) => void;
  onDragReorder: (from: number, to: number) => void;
  isReordering: boolean;
  dragIndex: number | null;
  dropIndex: number | null;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
}) {
  const preview =
    rail.type === "editorial" && rail.items?.length
      ? rail.items
          .slice(0, 3)
          .map((i) => i.content?.title)
          .filter(Boolean)
          .join(" · ")
      : null;

  const isDragging = dragIndex === index;
  const isDropTarget =
    dropIndex === index && dragIndex !== null && dragIndex !== index;

  return (
    <li
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (dragIndex !== null) onDragReorder(dragIndex, index);
        onDrop(index);
      }}
      className={`flex flex-wrap items-center gap-3 sm:gap-4 py-3.5 first:pt-0 last:pb-0 hover:bg-primary/[0.02] rounded-none px-1 -mx-1 transition-colors ${
        !rail.isActive ? "opacity-50" : ""
      } ${isDragging ? "opacity-40" : ""} ${isDropTarget ? "bg-primary/[0.06]" : ""}`}
    >
      <div className="flex items-center gap-2 shrink-0 w-14">
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            onDragStart(index);
          }}
          onDragEnd={onDragEnd}
          className="p-1 text-white/25 hover:text-white/50 cursor-grab active:cursor-grabbing"
          aria-label="Glisser pour réordonner"
        >
          <GripVertical size={14} />
        </button>
        <span className="text-[11px] font-mono text-white/35 tabular-nums w-6">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <p className="text-[13px] font-medium text-white/90 truncate">{rail.title}</p>
          <RailTypeBadge type={rail.type} />
          {!rail.isActive ? (
            <span className="text-[10px] px-2 py-0.5 border border-white/[0.08] text-white/25">
              inactif
            </span>
          ) : null}
        </div>
        <p className="text-[11px] text-white/30 font-mono truncate">{rail.code}</p>
        {preview ? (
          <p className="mt-1 text-[11px] text-white/40 font-light line-clamp-1">
            <Film size={10} className="inline mr-1 -mt-px opacity-50" />
            {preview}
            {rail._count.items > 3 ? ` +${rail._count.items - 3}` : ""}
          </p>
        ) : rail.type === "editorial" ? (
          <p className="mt-1 text-[11px] text-white/25 italic">Aucun titre assigné</p>
        ) : null}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          disabled={isReordering || index === 0}
          className="p-2 rounded-none text-white/35 hover:text-white hover:bg-white/[0.04] disabled:opacity-25 transition-colors"
          onClick={() => onReorder(-1)}
          aria-label="Monter"
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          disabled={isReordering || index === list.length - 1}
          className="p-2 rounded-none text-white/35 hover:text-white hover:bg-white/[0.04] disabled:opacity-25 transition-colors"
          onClick={() => onReorder(1)}
          aria-label="Descendre"
        >
          <ChevronDown size={14} />
        </button>
        <button
          type="button"
          className="p-2 rounded-none text-white/35 hover:text-primary hover:bg-primary/10 transition-colors"
          onClick={onEdit}
          aria-label="Modifier"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          className="p-2 rounded-none transition-colors"
          onClick={onToggle}
          aria-label={rail.isActive ? "Désactiver" : "Activer"}
        >
          {rail.isActive ? (
            <ToggleRight size={18} className="text-emerald-400/90" />
          ) : (
            <ToggleLeft size={18} className="text-white/30" />
          )}
        </button>
      </div>
    </li>
  );
}

export default function AdminRailsPage() {
  const qc = useQueryClient();
  const [surface, setSurface] = useState<CatalogRailSurface>("home");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AdminCatalogRail | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContents, setEditContents] = useState<RailContentItem[]>([]);
  const [editQuery, setEditQuery] = useState<CatalogRailQuery>({});
  const [editPlanCodes, setEditPlanCodes] = useState<string[]>([]);
  const [editCountryCodes, setEditCountryCodes] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newCodeTouched, setNewCodeTouched] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"editorial" | "query">("editorial");
  const [newQuery, setNewQuery] = useState<CatalogRailQuery>({});
  const [newPlanCodes, setNewPlanCodes] = useState<string[]>([]);
  const [newCountryCodes, setNewCountryCodes] = useState("");
  const [railDragIndex, setRailDragIndex] = useState<number | null>(null);
  const [railDropIndex, setRailDropIndex] = useState<number | null>(null);

  const { data: rails, isLoading } = useQuery({
    queryKey: ["admin-catalog-rails", surface],
    queryFn: () => catalogApi.adminList(surface),
  });

  const { data: refs } = useQuery({
    queryKey: ["references"],
    queryFn: referencesApi.getAll,
    staleTime: 5 * 60_000,
  });
  const contentTypes: { code: string; label: string }[] = refs?.contentTypes ?? [];

  const parseCodes = (v: string) =>
    v
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

  const list = rails ?? [];

  const stats = useMemo(() => {
    const active = list.filter((r) => r.isActive).length;
    const editorial = list.filter((r) => r.type === "editorial").length;
    return { total: list.length, active, editorial };
  }, [list]);

  const surfaceLabel = SURFACES.find((s) => s.code === surface)?.label ?? surface;

  const toggleMutation = useMutation({
    mutationFn: ({ code, isActive }: { code: string; isActive: boolean }) =>
      catalogApi.adminUpdate(code, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-catalog-rails"] });
      showApiSuccess("Rail mis à jour");
    },
    onError: showApiError,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await catalogApi.adminUpdate(editing.code, {
        title: editTitle,
        targetPlanCodes: editPlanCodes,
        targetCountryCodes: parseCodes(editCountryCodes),
        ...(editing.type === "query" && { query: editQuery }),
      });
      if (editing.type === "editorial") {
        await catalogApi.adminSetItems(
          editing.code,
          editContents.map((c) => c.id),
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-catalog-rails"] });
      setEditing(null);
      showApiSuccess("Rail enregistré");
    },
    onError: showApiError,
  });

  const reorderMutation = useMutation({
    mutationFn: (codes: string[]) => catalogApi.adminReorder(surface, codes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-catalog-rails", surface] });
      showApiSuccess("Ordre mis à jour");
    },
    onError: showApiError,
  });

  const reorderByDirection = (code: string, dir: -1 | 1, rows: AdminCatalogRail[]) => {
    const idx = rows.findIndex((r) => r.code === code);
    if (idx < 0) return;
    const swap = idx + dir;
    if (swap < 0 || swap >= rows.length) return;
    const next = [...rows];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    reorderMutation.mutate(next.map((r) => r.code));
  };

  const reorderByDrag = (from: number, to: number) => {
    if (from === to) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorderMutation.mutate(next.map((r) => r.code));
  };

  const createMutation = useMutation({
    mutationFn: () =>
      catalogApi.adminCreateRail({
        code: newCode.trim(),
        title: newTitle.trim(),
        surfaces: [surface],
        type: newType,
        ...(newType === "query" && { query: newQuery }),
        targetPlanCodes: newPlanCodes,
        targetCountryCodes: parseCodes(newCountryCodes),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-catalog-rails"] });
      setNewCode("");
      setNewCodeTouched(false);
      setNewTitle("");
      setNewType("editorial");
      setNewQuery({});
      setNewPlanCodes([]);
      setNewCountryCodes("");
      setShowCreate(false);
      showApiSuccess("Rail créé");
    },
    onError: showApiError,
  });

  const openEditor = (rail: AdminCatalogRail) => {
    setEditing(rail);
    setEditTitle(rail.title);
    setEditContents(
      rail.items?.map((i) => ({
        id: i.contentId,
        title: i.content?.title ?? i.contentId,
      })) ?? [],
    );
    setEditQuery(rail.queryJson ?? {});
    setEditPlanCodes(rail.targetPlanCodes ?? []);
    setEditCountryCodes((rail.targetCountryCodes ?? []).join(", "));
  };

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      {editing ? (
        <RailEditModal
          rail={editing}
          editTitle={editTitle}
          editContents={editContents}
          editQuery={editQuery}
          editPlanCodes={editPlanCodes}
          editCountryCodes={editCountryCodes}
          contentTypes={contentTypes}
          onTitleChange={setEditTitle}
          onContentsChange={setEditContents}
          onQueryChange={setEditQuery}
          onPlanCodesChange={setEditPlanCodes}
          onCountryCodesChange={setEditCountryCodes}
          onClose={() => setEditing(null)}
          onSave={() => saveMutation.mutate()}
          isSaving={saveMutation.isPending}
        />
      ) : null}

      <AdminPageHeader
        title="Rails catalogue"
        subtitle={`${stats.total} rail${stats.total !== 1 ? "s" : ""} sur ${surfaceLabel} — ordre, titres, filtres et ciblage`}
        action={
          <AdminPrimaryButton
            icon={Plus}
            onClick={() => setShowCreate((v) => !v)}
          >
            Nouveau rail
          </AdminPrimaryButton>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <AdminKpiCard label="Rails" value={stats.total} sub={surfaceLabel} icon={Layers} accent="primary" />
        <AdminKpiCard label="Actifs" value={stats.active} sub="Visibles viewer" icon={ToggleRight} accent="emerald" />
        <AdminKpiCard
          label="Éditoriaux"
          value={stats.editorial}
          sub="Collections manuelles"
          icon={Sparkles}
          accent="amber"
        />
      </div>

      <div className="mb-6">
        <AdminPills options={SURFACES} value={surface} onChange={setSurface} />
      </div>

      {showCreate ? (
        <AdminPanel title={`Nouveau rail · ${surfaceLabel}`} className="mb-6">
          <div className="mb-4">
            <label className={labelCls} htmlFor="rail-title">
              Titre affiché aux visiteurs
            </label>
            <input
              id="rail-title"
              className={inputCls}
              placeholder="Sélection de juin"
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
                if (!newCodeTouched) setNewCode(slugifyRailCode(e.target.value));
              }}
            />
            <p className="text-[11px] text-white/30 font-mono mt-1">
              Identifiant interne :{" "}
              {newCodeTouched ? (
                <input
                  className="bg-transparent border-b border-white/20 text-white/50 focus:outline-none focus:border-primary/50 font-mono text-[11px]"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                />
              ) : (
                <span>{newCode || "—"}</span>
              )}{" "}
              {!newCodeTouched && (
                <button
                  type="button"
                  onClick={() => setNewCodeTouched(true)}
                  className="text-primary/70 hover:text-primary underline underline-offset-2"
                >
                  modifier
                </button>
              )}
            </p>
          </div>

          <div className="mb-4">
            <label className={labelCls}>Comment ce rail se remplit-il ?</label>
            <div className="flex gap-2 mt-1.5">
              <TogglePill active={newType === "editorial"} onClick={() => setNewType("editorial")}>
                Je choisis les titres moi-même
              </TogglePill>
              <TogglePill active={newType === "query"} onClick={() => setNewType("query")}>
                Le système choisit automatiquement
              </TogglePill>
            </div>
            <p className="text-[12px] text-white/45 font-light mt-2">
              {newType === "editorial"
                ? "Après création, vous sélectionnerez les films/séries un par un dans l'éditeur — ils ne changent pas tout seuls."
                : "Vous définissez des critères ci-dessous (ex. genre, période 1990-1999...) — le rail se met à jour automatiquement quand de nouveaux titres correspondants sont publiés."}
            </p>
          </div>

          {newType === "query" ? (
            <div className="mb-4">
              <RailQueryFields query={newQuery} onChange={setNewQuery} contentTypes={contentTypes} />
            </div>
          ) : null}

          <div className="mb-4">
            <RailTargetingFields
              planCodes={newPlanCodes}
              onPlanCodesChange={setNewPlanCodes}
              countryCodes={newCountryCodes}
              onCountryCodesChange={setNewCountryCodes}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setNewCode("");
                setNewCodeTouched(false);
                setNewTitle("");
                setNewType("editorial");
                setNewQuery({});
                setNewPlanCodes([]);
                setNewCountryCodes("");
              }}
              className="px-4 py-2 rounded-none border border-white/[0.08] text-[13px] text-white/50 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={!newCode.trim() || !newTitle.trim() || createMutation.isPending}
              className="px-5 py-2 rounded-none bg-primary text-white text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              Créer
            </button>
          </div>
        </AdminPanel>
      ) : null}

      <AdminPanel
        title={`Ordre d'affichage · ${surfaceLabel}`}
        action={
          <span className="text-[10px] text-white/30 tabular-nums">
            {stats.active}/{stats.total} actifs
          </span>
        }
      >
        {isLoading ? (
          <AdminLoading className="py-12" />
        ) : list.length === 0 ? (
          <AdminEmpty
            icon={Layers}
            title="Aucun rail sur cette surface"
            description="Exécutez le seed catalogue ou créez un rail éditorial."
          />
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {list.map((rail, index) => (
              <RailRow
                key={rail.code}
                rail={rail}
                index={index}
                list={list}
                isReordering={reorderMutation.isPending}
                dragIndex={railDragIndex}
                dropIndex={railDropIndex}
                onDragStart={setRailDragIndex}
                onDragEnd={() => {
                  setRailDragIndex(null);
                  setRailDropIndex(null);
                }}
                onDragOver={setRailDropIndex}
                onDrop={() => {
                  setRailDragIndex(null);
                  setRailDropIndex(null);
                }}
                onEdit={() => openEditor(rail)}
                onToggle={() =>
                  toggleMutation.mutate({ code: rail.code, isActive: !rail.isActive })
                }
                onReorder={(dir) => reorderByDirection(rail.code, dir, list)}
                onDragReorder={reorderByDrag}
              />
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  );
}
