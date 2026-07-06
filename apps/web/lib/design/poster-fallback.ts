/** Dégradés fallback poster — par genre ou défaut iVOD */
const GENRE_GRADIENTS: Record<string, string> = {
  DRAME: "from-[#4a1060] via-[#7b0099] to-[#3d0a50]",
  COMEDIE: "from-[#8a5a00] via-[#ffb300] to-[#7b0099]",
  ACTION: "from-[#8a1800] via-[#ff7b00] to-[#4a1060]",
  ROMANCE: "from-[#6a1050] via-[#e6007e] to-[#4a1060]",
  THRILLER: "from-[#0a1520] via-[#1a2840] to-[#4a1060]",
  DOCUMENTAIRE: "from-[#0a2840] via-[#1a5070] to-[#0d1520]",
  ANIMATION: "from-[#5a0080] via-[#e6007e] to-[#ff7b00]",
  FANTASTIQUE: "from-[#2a1060] via-[#7b0099] to-[#0a1520]",
};

const DEFAULT_GRADIENT = "from-[#3d0a50] via-[#7b0099] to-[#1a0a28]";

export function posterFallbackGradient(genreCode?: string | null): string {
  if (!genreCode) return DEFAULT_GRADIENT;
  return GENRE_GRADIENTS[genreCode.toUpperCase()] ?? DEFAULT_GRADIENT;
}

export function posterFallbackInitials(title: string, max = 2): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "IV";
  if (words.length === 1) return words[0].slice(0, max).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
