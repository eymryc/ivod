import Image from "next/image";

const LOGO_SRC = "/logo/logo_sans_fond.png";

const SIZES = {
  sm: { width: 88, height: 36, className: "h-7 w-auto" },
  md: { width: 128, height: 52, className: "h-10 w-auto" },
  lg: { width: 180, height: 72, className: "h-12 md:h-14 w-auto" },
} as const;

type LoaderMarkProps = {
  size?: keyof typeof SIZES;
  showBar?: boolean;
  showTagline?: boolean;
  tagline?: string;
};

/** Marque animée seule (logo + halo + barre) — réutilisable dans modales / panneaux */
export function BrandLoaderMark({
  size = "lg",
  showBar = true,
  showTagline = true,
  tagline = "Chargement en cours",
}: LoaderMarkProps) {
  const dim = SIZES[size];

  return (
    <div
      className="ivod-brand-loader relative flex flex-col items-center"
      role="status"
      aria-label="Chargement iVOD"
      aria-live="polite"
    >
      <div className="relative flex items-center justify-center">
        <span
          className="ivod-brand-loader__glow pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[160%] w-[180%] rounded-full"
          aria-hidden
        />
        <span
          className="ivod-brand-loader__orbit ivod-brand-loader__orbit--a pointer-events-none absolute left-1/2 top-1/2 h-[132%] w-[152%] rounded-full border border-brand-magenta/25"
          aria-hidden
        />
        <span
          className="ivod-brand-loader__orbit ivod-brand-loader__orbit--b pointer-events-none absolute left-1/2 top-1/2 h-[118%] w-[138%] rounded-full border border-brand-gold/15"
          aria-hidden
        />
        <span
          className="ivod-brand-loader__ring pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[125%] w-[145%] rounded-full border border-white/[0.08]"
          aria-hidden
        />
        <div className="ivod-brand-loader__logo relative z-10">
          <Image
            src={LOGO_SRC}
            alt="iVOD"
            width={dim.width}
            height={dim.height}
            className={`${dim.className} drop-shadow-[0_0_32px_rgba(230,0,126,0.45)]`}
            loading="eager"
            priority
          />
          <span className="ivod-brand-loader__shimmer pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <span className="ivod-brand-loader__shimmer-bar" />
          </span>
        </div>
      </div>

      {showTagline && (
        <p className="ivod-brand-loader__tagline mt-6 text-caption font-semibold text-brand-magenta">
          {tagline}
        </p>
      )}

      {showBar && (
        <div className="ivod-brand-loader__track mt-5 h-[3px] w-36 overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_0_8px_rgba(0,0,0,0.4)]">
          <span className="ivod-brand-loader__track-fill block h-full w-2/5 rounded-full" />
        </div>
      )}
    </div>
  );
}

export type BrandLoaderProps = {
  fullScreen?: boolean;
  size?: keyof typeof SIZES;
  showBar?: boolean;
  showTagline?: boolean;
  tagline?: string;
  className?: string;
};

/** Animation de chargement iVOD — logo, halo orbital, barre dégradée */
export function BrandLoader({
  fullScreen = true,
  size = "lg",
  showBar = true,
  showTagline = true,
  tagline = "Chargement en cours",
  className = "",
}: BrandLoaderProps) {
  const mark = (
    <BrandLoaderMark
      size={size}
      showBar={showBar}
      showTagline={showTagline}
      tagline={tagline}
    />
  );

  if (!fullScreen) {
    return (
      <div className={`flex flex-1 items-center justify-center py-16 ${className}`.trim()}>
        {mark}
      </div>
    );
  }

  return (
    <div
      className={`ivod-brand-loader-screen page-canvas relative flex min-h-screen flex-col items-center justify-center overflow-hidden ${className}`.trim()}
    >
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 h-[min(420px,70vw)] w-[min(420px,70vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-magenta/10 blur-[100px]"
        aria-hidden
      />
      <div className="relative z-10">{mark}</div>
    </div>
  );
}
