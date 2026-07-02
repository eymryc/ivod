"use client";

import { useEffect, useRef } from "react";
import { RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { IvodSelect, type IvodSelectOption } from "@/components/ui/IvodField";
import type { CatalogSectionConfig } from "@/lib/catalog/sections";
import { CATALOG_MIN_RATINGS } from "@/lib/catalog/filter.constants";

type Option = { code: string; label: string };

type FilterSelectProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: IvodSelectOption[];
  placeholder?: string;
};

function FilterSelect({ id, label, value, onChange, options, placeholder }: FilterSelectProps) {
  const active = Boolean(value);
  return (
    <div className={`catalog-filter-field ${active ? "catalog-filter-field--active" : ""}`}>
      <IvodSelect
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        size="sm"
        searchable
        className={active ? "[&_.ivod-select-trigger]:border-brand-magenta/40 [&_.ivod-select-trigger]:bg-brand-purple/[0.08]" : undefined}
      />
    </div>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  section: CatalogSectionConfig;
  genre: string;
  year: string;
  minRating: string;
  genres: Option[];
  years: number[];
  hasActiveFilters: boolean;
  onGenreChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onMinRatingChange: (value: string) => void;
  onClearFilters: () => void;
};

export function CatalogFilterDrawer({
  open,
  onClose,
  section,
  genre,
  year,
  minRating,
  genres,
  years,
  hasActiveFilters,
  onGenreChange,
  onYearChange,
  onMinRatingChange,
  onClearFilters,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const genreOptions: IvodSelectOption[] = [
    { value: "", label: "Tous les genres" },
    ...genres.map((g) => ({ value: g.code, label: g.label })),
  ];

  const yearOptions: IvodSelectOption[] = [
    { value: "", label: "Toutes les années" },
    ...years.map((y) => ({ value: String(y), label: String(y) })),
  ];

  const ratingOptions: IvodSelectOption[] = CATALOG_MIN_RATINGS.map((r) => ({
    value: r.value,
    label: r.label,
  }));

  if (!open) return null;

  return (
    <div className="catalog-filter-drawer" role="dialog" aria-modal="true" aria-labelledby="catalog-filter-drawer-title">
      <button type="button" className="catalog-filter-drawer__backdrop" onClick={onClose} aria-label="Fermer" />
      <div ref={panelRef} className="catalog-filter-drawer__panel">
        <header className="catalog-filter-drawer__head">
          <div>
            <p className="catalog-filter-drawer__kicker">
              <SlidersHorizontal size={14} className="inline mr-1.5 -mt-0.5" />
              Filtres
            </p>
            <h2 id="catalog-filter-drawer-title" className="mt-1 text-lg font-semibold text-white">
              Affiner le catalogue
            </h2>
            <p className="mt-1 text-[12px] text-white/45 font-light">
              Genres, années et notes sur {section.title.toLowerCase()}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="catalog-filter-drawer__close"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </header>

        <div className="catalog-filter-drawer__body">
          <FilterSelect
            id="drawer-genre"
            label="Genre"
            value={genre}
            onChange={onGenreChange}
            options={genreOptions}
          />

          <FilterSelect
            id="drawer-year"
            label="Année"
            value={year}
            onChange={onYearChange}
            options={yearOptions}
          />

          <FilterSelect
            id="drawer-rating"
            label="Note"
            value={minRating}
            onChange={onMinRatingChange}
            options={ratingOptions}
          />
        </div>

        <footer className="catalog-filter-drawer__foot">
          {hasActiveFilters ? (
            <button type="button" onClick={onClearFilters} className="catalog-browse-toolbar__reset">
              <RotateCcw size={14} />
              Réinitialiser
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={onClose} className="catalog-filter-drawer__apply">
            Voir les résultats
          </button>
        </footer>
      </div>
    </div>
  );
}
