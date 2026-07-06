"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, Film } from "lucide-react";
import { peopleApi } from "@/lib/api/people";
import { assetUrl } from "@/lib/utils/assets";
import { MediaImage } from "@/components/ui/MediaImage";
import { ContentCard } from "@/components/content/ContentCard";
import { PAGE_X, VIEWER_GRID_CLASS } from "@/components/public/PublicShell";
import { BrandLoader } from "@/components/ui/BrandLoader";

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();

  // B5 — GET /people/:id inclut déjà la filmographie dans la réponse
  const { data: person, isLoading, error } = useQuery({
    queryKey: ["person", id],
    queryFn: () => peopleApi.getOne(id),
    staleTime: 30 * 60_000,
  });

  if (isLoading) {
    return <BrandLoader tagline="Filmographie" />;
  }

  if (error || !person) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center p-8">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-white font-medium">Personne introuvable</p>
      </div>
    );
  }

  const photoUrl = assetUrl(person.avatarObjectKey);

  // L'API inclut castAppearances et/ou crewAppearances dans la réponse de /people/:id
  const castAppearances: any[] = person.castAppearances ?? person.cast ?? [];
  const crewAppearances: any[] = person.crewAppearances ?? person.crew ?? [];

  // Dédupliqué par contentId — un film peut apparaître dans cast ET crew
  const contentMap = new Map<string, any>();
  [...castAppearances, ...crewAppearances].forEach((entry) => {
    const content = entry.content ?? entry;
    if (content?.id && !contentMap.has(content.id)) {
      contentMap.set(content.id, content);
    }
  });
  const contents = Array.from(contentMap.values());

  return (
    <div className={`min-h-screen py-8 sm:py-10 max-w-5xl mx-auto ${PAGE_X}`}>
      {/* Hero person */}
      <div className="flex flex-col sm:flex-row gap-6 mb-10">
        <div className="shrink-0">
          {photoUrl ? (
            <MediaImage
              src={photoUrl}
              alt={person.fullName}
              width={160}
              height={160}
              className="w-32 h-32 sm:w-40 sm:h-40 object-cover border border-white/10"
            />
          ) : (
            <div className="w-32 h-32 sm:w-40 sm:h-40 bg-surface border border-white/10 flex items-center justify-center text-4xl font-bold text-white/30">
              {person.fullName?.[0]}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">{person.fullName}</h1>
          {person.stageName && person.stageName !== person.fullName && (
            <p className="text-sm text-muted-foreground">Alias : {person.stageName}</p>
          )}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {person.nationality && <span>🌍 {person.nationality}</span>}
            {person.birthDate && (
              <span>
                🎂 {new Date(person.birthDate).toLocaleDateString("fr-CI", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </span>
            )}
          </div>
          {person.biography && (
            <p className="text-sm text-white/70 leading-relaxed mt-2 max-w-2xl line-clamp-5">
              {person.biography}
            </p>
          )}
        </div>
      </div>

      {/* Filmographie */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <Film size={18} className="text-primary" />
          <h2 className="text-lg font-bold">Filmographie</h2>
          {contents.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({contents.length} titre{contents.length > 1 ? "s" : ""})
            </span>
          )}
        </div>

        {contents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <p className="text-3xl">🎬</p>
            <p className="text-muted-foreground text-sm">Aucun contenu disponible pour le moment.</p>
          </div>
        ) : (
          <div className={VIEWER_GRID_CLASS}>
            {contents.map((content: any) => (
              <ContentCard key={content.id} content={content} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
