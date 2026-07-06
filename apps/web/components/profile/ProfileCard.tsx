import { Pencil, Shield } from "lucide-react";
import type { Profile } from "@/lib/stores/profile.store";
import { profileHasPin } from "@/lib/profile-utils";
import { resolveMediaSrc } from "@/lib/utils/assets";
import { MediaImage } from "@/components/ui/MediaImage";

interface ProfileCardProps {
  profile: Profile;
  isActive?: boolean;
  showEdit?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  size?: "sm" | "md" | "lg";
}

const AVATAR_GRADIENTS = [
  "from-brand-purple to-brand-magenta",
  "from-brand-magenta to-brand-orange",
  "from-brand-orange to-brand-gold",
  "from-indigo-700 to-brand-purple",
  "from-teal-700 to-emerald-600",
];

function getAvatarGradient(name: string): string {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

export function ProfileCard({ profile, isActive, showEdit, onClick, onEdit, size = "md" }: ProfileCardProps) {
  const avatarSize = { sm: "w-[4.5rem] h-[4.5rem] text-xl", md: "w-24 h-24 text-3xl", lg: "w-[7.5rem] h-[7.5rem] text-4xl" }[size];
  const wrapperSize = { sm: "w-[4.75rem] sm:w-[5rem]", md: "w-[6.5rem] sm:w-28", lg: "w-[7rem] sm:w-[8.25rem]" }[size];
  const protectedProfile = profileHasPin(profile);

  const avatarSrc = resolveMediaSrc(profile.avatarUrl);

  return (
    <div className={`flex flex-col items-center gap-3 ${wrapperSize}`}>
      <button
        type="button"
        onClick={onClick}
        className={`profile-card-avatar group relative overflow-hidden border-2 transition-all duration-300 ${avatarSize} ${
          isActive
            ? "border-brand-magenta shadow-[0_0_28px_rgba(230,0,126,0.35)] scale-[1.02]"
            : protectedProfile
              ? "border-brand-gold/35 hover:border-brand-gold/55 hover:shadow-[0_0_20px_rgba(255,179,0,0.15)]"
              : "border-white/15 hover:border-brand-magenta/50 hover:shadow-[0_0_20px_rgba(230,0,126,0.2)]"
        }`}
        aria-label={
          protectedProfile
            ? `Profil protégé ${profile.name}, mot de passe requis`
            : `Sélectionner le profil ${profile.name}`
        }
      >
        {avatarSrc ? (
          <MediaImage src={avatarSrc} alt={profile.name} fill className="object-cover" sizes="128px" />
        ) : (
          <div
            className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${getAvatarGradient(profile.name)} font-bold text-white`}
          >
            {profile.name[0]?.toUpperCase()}
          </div>
        )}
        <span className="absolute inset-0 bg-brand-magenta/0 group-hover:bg-brand-magenta/10 transition-colors pointer-events-none" />

        {profile.isKids && (
          <span className="absolute bottom-0 left-0 right-0 bg-sky-600/95 text-white text-[9px] font-bold tracking-wider text-center py-1 uppercase">
            Kids
          </span>
        )}

        {protectedProfile && (
          <span
            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center border border-brand-gold/40 bg-[#00050d]/90 text-brand-gold shadow-[0_0_12px_rgba(255,179,0,0.35)]"
            title="Protégé par mot de passe"
          >
            <Shield size={14} strokeWidth={2} />
          </span>
        )}
      </button>

      <div className="flex items-center gap-1 w-full justify-center min-h-[1.25rem]">
        {protectedProfile && (
          <Shield size={12} className="text-brand-gold/80 shrink-0" aria-hidden />
        )}
        <span
          className={`text-sm font-semibold truncate text-center tracking-wide ${
            isActive ? "text-brand-magenta" : "text-white/85"
          }`}
        >
          {profile.name}
        </span>
        {showEdit && onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label={`Modifier ${profile.name}`}
            className="ivod-btn p-1 border border-transparent text-white/40 hover:text-brand-magenta hover:border-white/15 transition-colors shrink-0"
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
      {profile.isDefault && (
        <span className="text-caption text-secondary-token font-medium">Par défaut</span>
      )}
      {protectedProfile && (
        <span className="text-caption text-brand-gold/70 font-medium">Sécurisé</span>
      )}
    </div>
  );
}
