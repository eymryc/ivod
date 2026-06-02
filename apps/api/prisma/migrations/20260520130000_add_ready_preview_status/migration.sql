-- Preview HLS disponible avant la fin du transcodage complet
ALTER TYPE "VideoAssetStatus" ADD VALUE IF NOT EXISTS 'READY_PREVIEW';
