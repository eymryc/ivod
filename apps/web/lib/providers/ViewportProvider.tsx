"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ViewportContextValue = {
  reducedMotion: boolean;
  canHover: boolean;
  isNarrowViewport: boolean;
};

const ViewportContext = createContext<ViewportContextValue>({
  reducedMotion: false,
  canHover: false,
  isNarrowViewport: false,
});

/** Un seul listener matchMedia pour toute l'app (évite N×3 hooks par ContentCard). */
export function ViewportProvider({ children }: { children: ReactNode }) {
  const [viewport, setViewport] = useState<ViewportContextValue>({
    reducedMotion: false,
    canHover: false,
    isNarrowViewport: false,
  });

  useEffect(() => {
    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hoverMq = window.matchMedia("(hover: hover)");
    const narrowMq = window.matchMedia("(max-width: 767px)");

    const sync = () => {
      setViewport({
        reducedMotion: reducedMq.matches,
        canHover: hoverMq.matches,
        isNarrowViewport: narrowMq.matches,
      });
    };

    sync();
    reducedMq.addEventListener("change", sync);
    hoverMq.addEventListener("change", sync);
    narrowMq.addEventListener("change", sync);
    return () => {
      reducedMq.removeEventListener("change", sync);
      hoverMq.removeEventListener("change", sync);
      narrowMq.removeEventListener("change", sync);
    };
  }, []);

  const value = useMemo(() => viewport, [viewport]);

  return (
    <ViewportContext.Provider value={value}>{children}</ViewportContext.Provider>
  );
}

export function useViewport() {
  return useContext(ViewportContext);
}
