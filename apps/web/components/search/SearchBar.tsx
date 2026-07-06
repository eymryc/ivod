"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchApi } from "@/lib/api/search";
import { SearchSuggestionCard } from "@/components/search/SearchSuggestionCard";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useCatalogMaturityFilter } from "@/lib/hooks/useCatalogMaturityFilter";
import type { SearchSuggestion } from "@/lib/types/search-suggestion";
import { contentDetailHref } from "@/lib/utils/content-type";

interface Props {
  onClose?: () => void;
  autoFocus?: boolean;
  initialQuery?: string;
  /** Met à jour l'URL sur /search sans recharger toute la page */
  syncUrl?: boolean;
}

export function SearchBar({ onClose, autoFocus, initialQuery = "", syncUrl }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const maxMaturityCode = useCatalogMaturityFilter();

  const onSearchPage = pathname === "/search";
  const shouldSyncUrl = syncUrl ?? onSearchPage;

  const debouncedQ = useDebounce(query, 300);

  const { data, isError, error } = useQuery({
    queryKey: ["autocomplete", debouncedQ, maxMaturityCode],
    queryFn: () => searchApi.autocomplete(debouncedQ, maxMaturityCode),
    enabled: debouncedQ.trim().length >= 2,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const navigateToSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;

      if (shouldSyncUrl) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("q", trimmed);
        router.replace(`/search?${params.toString()}`, { scroll: false });
      } else {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
      onClose?.();
    },
    [shouldSyncUrl, searchParams, router, onClose],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateToSearch(query);
  };

  const suggestions: SearchSuggestion[] = data?.suggestions ?? [];

  const openSuggestion = (s: SearchSuggestion) => {
    if (s.type === "CREATOR" && s.id) {
      router.push(`/creator/${s.id}`);
    } else if (s.id) {
      router.push(contentDetailHref(s.id, s.type !== "CREATOR" ? s.type : null));
    } else {
      navigateToSearch(s.title);
    }
    onClose?.();
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="ivod-btn flex items-center gap-3 bg-white/10 border border-white/15 px-4 md:px-5 py-3.5 md:py-4">
          <Search size={20} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Rechercher films, séries, créateurs…"
            className="ivod-field-exempt flex-1 bg-transparent text-[15px] md:text-base text-white placeholder:text-muted-foreground outline-none border-0 shadow-none"
            autoComplete="off"
            aria-label="Rechercher dans le catalogue"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                if (shouldSyncUrl) router.replace("/search", { scroll: false });
              }}
              className="text-muted-foreground hover:text-white"
              aria-label="Effacer la recherche"
            >
              <X size={16} />
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-white ml-2">
              Fermer
            </button>
          )}
        </div>
      </form>

      {isError && focused && (
        <p className="mt-2 text-[12px] text-red-400/90">
          {(error as Error)?.message ?? "Impossible de charger les suggestions."}
        </p>
      )}

      {focused && debouncedQ.trim().length >= 2 && !isError && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-[#0a0f18]/98 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl z-50 max-h-[min(75vh,560px)] overflow-y-auto rounded-sm">
          <p className="px-4 md:px-5 py-3 text-caption font-semibold text-secondary-token border-b border-white/[0.06]">
            Suggestions
          </p>
          {suggestions.map((s, i) => (
            <SearchSuggestionCard
              key={`${s.type}-${s.id ?? i}`}
              suggestion={s}
              onSelect={() => openSuggestion(s)}
            />
          ))}
          <button
            type="button"
            className="w-full px-4 py-4 text-sm font-medium text-white/50 hover:text-brand-magenta hover:bg-white/[0.04] transition-colors text-center border-t border-white/[0.06]"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => navigateToSearch(query)}
          >
            Voir tous les résultats pour « {query.trim()} »
          </button>
        </div>
      )}

      {focused && debouncedQ.trim().length >= 2 && !isError && suggestions.length === 0 && (
        <p className="absolute top-full left-0 right-0 mt-2 px-4 py-3 text-[12px] text-white/45 bg-surface border border-white/10">
          Aucune suggestion — appuyez sur Entrée pour lancer la recherche.
        </p>
      )}
    </div>
  );
}
