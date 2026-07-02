/** Placeholder pendant le chargement de useSearchParams (Suspense) */
export function NavbarFallback() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 nav-header-elevated">
      <div className="h-[3.75rem] nav-bar-glass" />
    </header>
  );
}
