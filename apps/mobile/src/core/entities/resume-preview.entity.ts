/** Vignette storyboard à la seconde exacte de reprise (API + mobile). */
export interface ResumePreviewFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  spriteWidth: number;
  spriteHeight: number;
  tileIndex?: number;
}

export interface ResumePreview {
  spriteObjectKey: string;
  spriteUrl?: string | null;
  watchedSeconds: number;
  frame: ResumePreviewFrame;
}
