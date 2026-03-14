
"use client";

import { useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Package, AlertTriangle, Activity, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemoFirebase } from "@/firebase/use-memo-firebase";
import { Button } from "@/components/ui/button";

export default function AdminOverview() {
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"), orderBy("created_at", "desc"));
  }, [firestore]);

  const asinsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "asins"));
  }, [firestore]);

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "alerts"), orderBy("timestamp", "desc"), limit(10));
  }, [firestore]);

  const { data: allUsers } = useCollection(usersQuery);
  const { data: allAsins } = useCollection(asinsQuery);
  const { data: recentAlerts } = useCollection(alertsQuery);

  const stats = [
    { label: "Platform Users", value: allUsers?.length || 0, icon: <Users className="h-5 w-5 text-blue-500" /> },
    { label: "Total ASINs", value: allAsins?.length || 0, icon: <Package className="h-5 w-5 text-accent" /> },
    { label: "Active Alerts", value: recentAlerts?.filter(a => a.status !== 'resolved').length || 0, icon: <AlertTriangle className="h-5 w-5 text-yellow-500" /> },
    { label: "Suspended Users", value: allUsers?.filter(u => u.status === 'suspended').length || 0, icon: <ShieldCheck className="h-5 w-5 text-destructive" /> },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Platform Control Center</h1>
        <p className="text-muted-foreground">Manage global infrastructure and user security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">{stat.label}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-headline">Recent Users</CardTitle>
              <CardDescription>Latest enrollments across the platform</CardDescription>
            </div>
            <Link href="/dashboard/admin/users">
              <Button variant="ghost" size="sm" className="text-xs gap-2">
                Manage All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {allUsers?.slice(0, 5).map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs uppercase">
                    {u.email?.substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-bold truncate max-w-[150px]">{u.email}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{u.subscription_plan}</p>
                  </div>
                </div>
                <div className={`h-2 w-2 rounded-full ${u.status === 'suspended' ? 'bg-destructive' : 'bg-green-500'}`} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-headline">System Alerts Feed</CardTitle>
              <CardDescription>Global operational issues detected</CardDescription>
            </div>
            <Link href="/dashboard/admin/alerts">
              <Button variant="ghost" size="sm" className="text-xs gap-2">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAlerts?.slice(0, 5).map(alert => (
              <div key={alert.id} className="p-3 rounded-lg bg-card border flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold">{alert.alert_type.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] font-mono text-accent">{alert.asin_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">{alert.timestamp?.toDate().toLocaleDateString()}</p>
                  <span className={`text-[8px] font-bold uppercase ${alert.severity === 'high' ? 'text-destructive' : 'text-yellow-500'}`}>
                    {alert.severity}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
