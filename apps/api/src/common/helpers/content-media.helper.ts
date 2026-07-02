type MediaAssetRow = { objectKey: string; type?: { code: string } | null; isPrimary?: boolean };

function pickAssetKey(assets: MediaAssetRow[], code: string): string | null {
  return (
    assets.find((a) => a.type?.code === code && a.isPrimary)?.objectKey ??
    assets.find((a) => a.type?.code === code)?.objectKey ??
    null
  );
}

/** Clés d’images catalogue : affiche POSTER (primaire), vignette THUMBNAIL, snapshot vidéo */
export function resolveContentImageKeys(
  mediaAssets: MediaAssetRow[] | undefined | null,
  videoPosterObjectKey?: string | null,
) {
  const assets = mediaAssets ?? [];
  const primaryCover =
    assets.find(
      (a) => a.isPrimary && ['POSTER', 'THUMBNAIL'].includes(a.type?.code ?? ''),
    )?.objectKey ?? null;
  const posterMedia = pickAssetKey(assets, 'POSTER');
  const thumbMedia = pickAssetKey(assets, 'THUMBNAIL');
  const videoPoster = videoPosterObjectKey ?? null;

  return {
    posterObjectKey: primaryCover ?? posterMedia ?? videoPoster ?? thumbMedia ?? null,
    thumbnailObjectKey: thumbMedia ?? null,
    videoPosterObjectKey: videoPoster,
  };
}
