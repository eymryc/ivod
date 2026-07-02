"use client";

import { useParams } from "next/navigation";
import { SeriesEpisodesStudio } from "@/components/studio/SeriesEpisodesStudio";

export default function EpisodesPage() {
  const { id } = useParams<{ id: string }>();
  return <SeriesEpisodesStudio contentId={id} />;
}
