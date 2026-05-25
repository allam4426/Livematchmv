import { useGetStatsSummary } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Calendar, CheckCircle2, Trophy, Users, Video } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetStatsSummary();

  const statCards = [
    { label: "Live Matches", value: stats?.liveMatchCount, icon: Activity, color: "text-red-400", bg: "bg-red-500/10" },
    { label: "Scheduled", value: stats?.scheduledMatchCount, icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Finished", value: stats?.finishedMatchCount, icon: CheckCircle2, color: "text-muted-foreground", bg: "bg-muted/50" },
    { label: "Teams", value: stats?.totalTeams, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Highlights", value: stats?.totalHighlights, icon: Video, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Streams", value: stats?.totalStreams, icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  ];

  return (
    <div className="pb-6">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-black text-foreground">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Platform overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          : statCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3">
                  <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-foreground">{stat.value ?? 0}</div>
                    <div className="text-xs text-muted-foreground font-medium mt-0.5">{stat.label}</div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Manage sections placeholder */}
      <div className="px-4 space-y-3">
        {["Matches", "Teams", "Streams", "Highlights"].map((section) => (
          <div key={section} className="bg-card rounded-xl border border-border px-4 py-3.5 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Manage {section}</span>
            <span className="text-xs bg-primary/15 text-primary border border-primary/25 px-2.5 py-1 rounded-full font-semibold">
              Coming Soon
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
