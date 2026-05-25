import { useGetStatsSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Calendar, CheckCircle2, Trophy, Users, Video } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetStatsSummary();

  const statCards = [
    { label: "Live Matches", value: stats?.liveMatchCount, icon: Activity, color: "text-primary" },
    { label: "Scheduled", value: stats?.scheduledMatchCount, icon: Calendar, color: "text-blue-500" },
    { label: "Finished", value: stats?.finishedMatchCount, icon: CheckCircle2, color: "text-muted-foreground" },
    { label: "Teams", value: stats?.totalTeams, icon: Users, color: "text-orange-500" },
    { label: "Highlights", value: stats?.totalHighlights, icon: Video, color: "text-purple-500" },
    { label: "Streams", value: stats?.totalStreams, icon: Trophy, color: "text-yellow-500" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))
        ) : (
          statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value || 0}</div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="py-12 text-center text-muted-foreground bg-card/50 rounded-2xl border border-border border-dashed">
        <p>Management forms (Matches, Teams, Streams) would be implemented here in a full app.</p>
        <p className="text-sm mt-2 opacity-60">Admin interface scaffolded.</p>
      </div>
    </div>
  );
}
