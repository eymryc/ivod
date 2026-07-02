"use client";

import { SlidersHorizontal } from "lucide-react";

type Props = {
  onClick: () => void;
  activeCount?: number;
  className?: string;
};

export function CatalogFilterButton({ onClick, activeCount = 0, className = "" }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`catalog-filter-trigger ${activeCount > 0 ? "catalog-filter-trigger--active" : ""} ${className}`}
      aria-haspopup="dialog"
    >
      <SlidersHorizontal size={16} />
      <span>Filtres</span>
      {activeCount > 0 ? (
        <span className="catalog-browse-toolbar__badge">{activeCount}</span>
      ) : null}
    </button>
  );
}
