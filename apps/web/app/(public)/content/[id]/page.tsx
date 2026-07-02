import type { Metadata } from "next";
import { ContentDetailClient } from "./content-detail-client";
import { serverFetchContent } from "@/lib/api/server-fetch";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const content = await serverFetchContent<{ title?: string; shortDescription?: string; description?: string }>(
    `/contents/${id}`,
  );
  if (!content?.title) return { title: "Contenu" };
  return {
    title: content.title,
    description: content.shortDescription ?? content.description,
  };
}

export default async function ContentPage({ params }: Props) {
  const { id } = await params;
  const content = await serverFetchContent(`/contents/${id}`);

  return <ContentDetailClient id={id} initialContent={content} />;
}
