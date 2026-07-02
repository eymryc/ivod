export interface AdminDashboard {
  users: { total: number; newThisMonth: number };
  creators: { total: number };
  contents: { total: number; published: number; pending: number };
  pendingReports: number;
  views7d: number;
  monthlyRevenue: number;
  weeklyViews: Array<{ date: string; views: number }>;
  monthlyRevenue12m: Array<{ month: string; amount: number }>;
}

export function formatAdminChartDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("fr-CI", { weekday: "short", day: "numeric" });
}
