/** Message lisible pour les erreurs pipeline (studio créateur). */
export function formatPipelineErrorMessage(raw?: string | null): string {
  if (!raw?.trim()) {
    return "Le traitement vidéo a échoué. Relancez l'encodage ou envoyez à nouveau le fichier.";
  }

  const msg = raw.trim();
  const lower = msg.toLowerCase();

  if (lower.includes("worker redémarré") || lower.includes("worker restart")) {
    return "L'encodage a été interrompu (redémarrage serveur). Relancez-le — le fichier source est conservé.";
  }
  if (lower.includes("ffprobe") || lower.includes("no video stream")) {
    return "Fichier vidéo illisible ou format non supporté. Essayez un MP4 ou MKV.";
  }
  if (lower.includes("introuvable") || lower.includes("not found")) {
    return "Fichier source introuvable. Ré-uploadez la vidéo.";
  }

  return msg;
}
