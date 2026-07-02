/** Estime le volume réseau restant pour terminer (~1,5 Mbit/s mobile SD). */
export function estimateResumeDataMb(remainingSec: number, bitrateMbps = 1.5): number {
  if (remainingSec <= 0) return 0;
  return Math.round(((remainingSec * bitrateMbps) / 8 / 1024) * 10) / 10;
}
