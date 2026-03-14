
"use client";

import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ExternalLink, Loader2, Bell, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useMemoFirebase } from "@/firebase/use-memo-firebase";

export default function AlertsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "alerts"),
      where("user_id", "==", user.uid),
      orderBy("timestamp", "desc")
    );
  }, [firestore, user?.uid]);

  const { data: alerts, loading } = useCollection(alertsQuery);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Alerts Center</h1>
          <p className="text-muted-foreground mt-1">Operational issues and critical performance drops</p>
        </div>
        <Badge variant="outline" className="px-4 py-1 border-accent/30 bg-accent/5">
          <Bell className="h-4 w-4 mr-2 text-accent" />
          {alerts?.length || 0} Detections
        </Badge>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-headline">History</CardTitle>
            <CardDescription>Comprehensive log of all system detections and email alerts sent</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts && alerts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ASIN</TableHead>
                    <TableHead>Issue Type</TableHead>
                    <TableHead>Diagnostic Reason</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id} className="group">
                      <TableCell className="font-mono text-xs font-bold text-accent">{alert.asin_code}</TableCell>
                      <TableCell className="font-medium">{alert.alert_type.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`h-4 w-4 ${alert.severity === 'high' ? 'text-destructive' : 'text-yellow-500'}`} />
                          <span className="text-sm font-semibold">{alert.reason.replace(/_/g, ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={alert.severity === 'high' ? 'destructive' : 'outline'} className="uppercase text-[10px]">
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {alert.timestamp?.toDate().toLocaleString() || "Just now"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/asin/${alert.asin_code}`}>
                          <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="p-4 rounded-full bg-green-500/10 text-green-500">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-headline">System Healthy</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">No operational issues or sales drops have been detected recently.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
