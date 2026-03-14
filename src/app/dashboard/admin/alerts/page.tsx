
"use client";

import { useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMemoFirebase } from "@/firebase/use-memo-firebase";
import { AlertTriangle, ExternalLink, User } from "lucide-react";
import Link from "next/link";

export default function AdminAlertsPage() {
  const firestore = useFirestore();

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "alerts"), orderBy("timestamp", "desc"), limit(100));
  }, [firestore]);

  const { data: alerts, loading } = useCollection(alertsQuery);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-headline">Global Alerts Feed</h1>
        <p className="text-sm text-muted-foreground">Monitor operational signals across all user catalogs.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>ASIN</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts?.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell className="text-[10px] text-muted-foreground">
                    {alert.timestamp?.toDate().toLocaleString()}
                  </TableCell>
                  <TableCell className="text-[10px] font-mono">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {alert.user_id.substring(0, 8)}...
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-accent">
                    {alert.asin_code}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{alert.alert_type.replace(/_/g, ' ')}</span>
                      <span className="text-[9px] text-muted-foreground truncate max-w-[150px]">{alert.reason}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={alert.severity === 'high' ? 'destructive' : 'outline'} className="text-[8px] uppercase">
                      {alert.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={alert.status === 'resolved' ? 'secondary' : 'default'} className="text-[8px] capitalize">
                      {alert.status || "active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/asin/${alert.asin_code}`}>
                      <ExternalLink className="h-4 w-4 text-accent opacity-50 hover:opacity-100" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
