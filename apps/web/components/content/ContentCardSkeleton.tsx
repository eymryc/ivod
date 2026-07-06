export function ContentCardSkeleton({ variant = "rail" }: { variant?: "rail" | "grid" }) {
  if (variant === "grid") {
    return (
      <div className="w-full">
        <div className="aspect-[2/3] w-full ivod-shimmer" />
        <div className="mt-3 space-y-2">
          <div className="h-4 ivod-shimmer w-4/5" />
          <div className="h-3.5 ivod-shimmer w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-shrink-0 snap-start overflow-hidden"
      style={{ width: 168, height: 252 }}
    >
      <div className="h-full w-full ivod-shimmer" />
    </div>
  );
}
