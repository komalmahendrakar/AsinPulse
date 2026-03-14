
"use client";

import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy, doc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ExternalLink, Loader2, Bell, CheckCircle2, History, Filter } from "lucide-react";
import Link from "next/link";
import { useMemoFirebase } from "@/firebase/use-memo-firebase";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AlertsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "alerts"),
      where("user_id", "==", user.uid),
      orderBy("timestamp", "desc")
    );
  }, [firestore, user?.uid]);

  const { data: alerts, loading } = useCollection(alertsQuery);

  const resolveAlert = async (alertId: string) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, "alerts", alertId), {
        status: "resolved"
      });
      toast({ title: "Alert Resolved", description: "The issue has been marked as addressed." });
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAlerts = alerts?.filter(alert => {
    if (filter === "critical") return alert.severity === "high" && alert.status !== "resolved";
    if (filter === "resolved") return alert.status === "resolved";
    if (filter === "recent") {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      return alert.timestamp?.toDate() > oneDayAgo;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Alerts Center</h1>
          <p className="text-muted-foreground mt-1">Manage operational issues and performance drops</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-4 py-1 border-accent/30 bg-accent/5">
            <Bell className="h-4 w-4 mr-2 text-accent" />
            {alerts?.filter(a => a.status !== "resolved").length || 0} Active Issues
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setFilter}>
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-muted/50 border">
            <TabsTrigger value="all">All Alerts</TabsTrigger>
            <TabsTrigger value="critical" className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">Critical</TabsTrigger>
            <TabsTrigger value="recent">Recent (24h)</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3 w-3" />
            <span>Filtering by: <span className="text-foreground font-semibold capitalize">{filter}</span></span>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {filteredAlerts && filteredAlerts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>ASIN</TableHead>
                    <TableHead>Issue / Diagnostic</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert) => (
                    <TableRow key={alert.id} className="group transition-colors">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {alert.timestamp?.toDate().toLocaleString() || "Just now"}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-accent">
                        {alert.asin_code}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`h-4 w-4 ${alert.severity === 'high' ? 'text-destructive' : 'text-yellow-500'}`} />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{alert.alert_type.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] text-muted-foreground">{alert.reason.replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={alert.severity === 'high' ? 'destructive' : 'outline'} className="uppercase text-[10px]">
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={alert.status === 'resolved' ? 'secondary' : 'default'} className="text-[10px] capitalize">
                          {alert.status || "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {alert.status !== 'resolved' && (
                            <button 
                              onClick={() => resolveAlert(alert.id)}
                              className="text-[10px] font-bold text-muted-foreground hover:text-green-500 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Resolve
                            </button>
                          )}
                          <Link href={`/dashboard/asin/${alert.asin_code}`}>
                            <ExternalLink className="h-4 w-4 text-accent opacity-50 hover:opacity-100 transition-opacity" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <div className="p-6 rounded-full bg-muted/20 text-muted-foreground/50">
                  <Bell className="h-12 w-12" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-headline">No matching alerts</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">Try changing your filters or check back later for new detections.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
