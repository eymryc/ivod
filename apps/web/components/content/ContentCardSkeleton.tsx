export function ContentCardSkeleton({ variant = "rail" }: { variant?: "rail" | "grid" }) {
  if (variant === "grid") {
    return (
      <div className="animate-pulse w-full">
        <div className="aspect-[2/3] w-full rounded-none bg-white/[0.06]" />
        <div className="mt-3 space-y-2">
          <div className="h-4 bg-white/[0.06] rounded w-4/5" />
          <div className="h-3.5 bg-white/[0.04] rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-shrink-0 snap-start animate-pulse"
      style={{ width: 272, height: 408 }}
    >
      <div className="h-full w-full rounded-none bg-white/[0.06]" />
      <div className="mt-3 space-y-2 md:hidden">
        <div className="h-4 bg-white/[0.06] rounded w-4/5" />
        <div className="h-3.5 bg-white/[0.04] rounded w-1/2" />
      </div>
    </div>
  );
}
