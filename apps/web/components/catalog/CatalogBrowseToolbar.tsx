"use client";

import { RotateCcw, X } from "lucide-react";
import type { CatalogSectionConfig } from "@/lib/catalog/sections";
import { CatalogFilterDrawer } from "@/components/catalog/CatalogFilterDrawer";
import { CatalogFilterButton } from "@/components/catalog/CatalogFilterButton";

import { CATALOG_SORT_OPTIONS } from "@/lib/catalog/filter.constants";

export { CATALOG_SORT_OPTIONS, CATALOG_MIN_RATINGS } from "@/lib/catalog/filter.constants";

type Option = { code: string; label: string };

type Props = {
  section: CatalogSectionConfig;
  genre: string;
  year: string;
  minRating: string;
  sort: string;
  genres: Option[];
  years: number[];
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  activeChips: string[];
  onGenreChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onMinRatingChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onClearFilters: () => void;
};

export function CatalogBrowseToolbar({
  section,
  genre,
  year,
  minRating,
  sort,
  genres,
  years,
  filtersOpen,
  onFiltersOpenChange,
  hasActiveFilters,
  activeFilterCount,
  activeChips,
  onGenreChange,
  onYearChange,
  onMinRatingChange,
  onSortChange,
  onClearFilters,
}: Props) {
  return (
    <>
      <div className="catalog-browse-toolbar mb-4 md:mb-5">
        <div className="catalog-browse-toolbar__bar">
          <div className="catalog-browse-toolbar__sort" role="group" aria-label="Trier par">
            <span className="catalog-sort-label">Trier par</span>
            <div className="catalog-sort-segment">
              {CATALOG_SORT_OPTIONS.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => onSortChange(s.code)}
                  className={`catalog-sort-btn ${sort === s.code ? "is-active" : ""}`}
                  aria-pressed={sort === s.code}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <CatalogFilterButton
            onClick={() => onFiltersOpenChange(true)}
            activeCount={activeFilterCount}
          />
        </div>

        {activeChips.length > 0 && (
          <div className="catalog-browse-toolbar__chips">
            <span className="catalog-browse-toolbar__chips-label">Sélection</span>
            <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
              {activeChips.map((label) => (
                <span key={label} className="catalog-filter-chip">
                  {label}
                </span>
              ))}
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="catalog-browse-toolbar__reset catalog-browse-toolbar__reset--inline"
              >
                <RotateCcw size={14} />
                Réinitialiser
              </button>
            )}
            <button
              type="button"
              onClick={onClearFilters}
              className="catalog-browse-toolbar__chips-clear sm:hidden"
              aria-label="Effacer tous les filtres"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <CatalogFilterDrawer
        open={filtersOpen}
        onClose={() => onFiltersOpenChange(false)}
        section={section}
        genre={genre}
        year={year}
        minRating={minRating}
        genres={genres}
        years={years}
        hasActiveFilters={hasActiveFilters}
        onGenreChange={onGenreChange}
        onYearChange={onYearChange}
        onMinRatingChange={onMinRatingChange}
        onClearFilters={onClearFilters}
      />
    </>
  );
}
