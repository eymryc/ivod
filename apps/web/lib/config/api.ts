export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3000";
export const MINIO_URL = process.env.NEXT_PUBLIC_MINIO_URL ?? "http://localhost:9000";
export const ASSETS_BUCKET = process.env.NEXT_PUBLIC_MINIO_ASSETS_BUCKET ?? "ivod-assets";
export const VIDEOS_BUCKET = process.env.NEXT_PUBLIC_MINIO_VIDEOS_BUCKET ?? "ivod-videos";
