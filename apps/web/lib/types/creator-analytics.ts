export interface CreatorAnalyticsTopContent {
  id: string;
  title: string;
  viewCount: number;
  likeCount?: number;
  avgRating?: number;
  watchHours?: number;
  completionRate?: number;
  thumbnailObjectKey?: string | null;
}

export interface CreatorAnalytics {
  period: string;
  totalContents: number;
  totalViews: number;
  recentViews: number;
  totalWatchTimeSec: number;
  totalWatchHours: number;
  totalLikes: number;
  avgRating: number;
  avgCompletionRate: number;
  totalEarned?: number;
  dailyViews: Array<{ date: string; views: number }>;
  dailyWatchTime: Array<{ date: string; watchTimeSec: number }>;
  topContents: CreatorAnalyticsTopContent[];
}

export function formatChartDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("fr-CI", { day: "numeric", month: "short" });
}
