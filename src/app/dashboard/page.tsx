
"use client";

import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Package, TrendingUp, Search, Plus, ExternalLink, Activity, Info, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useMemoFirebase } from "@/firebase/use-memo-firebase";

export default function DashboardOverview() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [search, setSearch] = useState("");

  const asinsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, "asins"), where("user_id", "==", user.uid));
  }, [firestore, user?.uid]);

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, "alerts"), where("user_id", "==", user.uid), orderBy("timestamp", "desc"), limit(5));
  }, [firestore, user?.uid]);

  const { data: asins } = useCollection(asinsQuery);
  const { data: alerts } = useCollection(alertsQuery);

  const stats = [
    { label: "Tracked ASINs", value: asins?.length.toString() || "0", sub: "Active monitoring", icon: <Package className="h-5 w-5 text-accent" /> },
    { label: "Active Alerts", value: alerts?.length.toString() || "0", sub: "Recent detections", icon: <AlertTriangle className="h-5 w-5 text-destructive" /> },
    { label: "Avg. Price", value: "$124.99", sub: "Stable catalog", icon: <TrendingUp className="h-5 w-5 text-green-500" /> },
    { label: "Sync Status", value: "Live", sub: "Operational", icon: <Activity className="h-5 w-5 text-primary" /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-card shadow-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">{stat.label}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-headline">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-headline">Recent ASINs</CardTitle>
              <CardDescription>Latest tracked products</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="pl-9 h-9 w-40 md:w-64"
                value={search}
                onChange={(e) => setSearch(e.setSearch(e.target.value))}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ASIN</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asins?.slice(0, 5).map((asin) => (
                  <TableRow key={asin.id} className="group">
                    <TableCell className="font-mono text-xs text-accent font-semibold">{asin.asin_code}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{asin.product_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-green-500">Active</Badge></TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/asin/${asin.asin_code}`}>
                        <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm border-accent/20 bg-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 font-headline">
                <AlertTriangle className="h-5 w-5 text-accent" /> Latest Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts && alerts.length > 0 ? (
                alerts.map((alert) => (
                  <div key={alert.id} className="p-4 rounded-xl bg-card border border-border">
                    <div className="flex justify-between mb-2">
                      <span className="text-xs font-mono text-accent">{alert.asin_code}</span>
                      <Badge variant="destructive" className="text-[10px] h-4 uppercase">{alert.severity}</Badge>
                    </div>
                    <p className="text-sm font-bold mb-1">{alert.alert_type.replace('_', ' ')}</p>
                    <p className="text-xs font-medium text-destructive mb-3">{alert.reason.replace(/_/g, ' ')}</p>
                    <Link href={`/dashboard/asin/${alert.asin_code}`}>
                      <button className="w-full text-xs h-8 border rounded-md hover:bg-accent/10">View Analysis</button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm italic">No active alerts.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
