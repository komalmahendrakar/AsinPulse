
"use client";

import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Package, TrendingUp, TrendingDown, Search, Plus, ExternalLink, Activity, Info, AlertTriangle } from "lucide-react";
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
    { label: "Avg. Price", value: "$124.50", sub: "Across catalog", icon: <TrendingUp className="h-5 w-5 text-green-500" /> },
    { label: "Sync Status", value: "99.9%", sub: "System Uptime", icon: <Activity className="h-5 w-5 text-primary" /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* KPI Section */}
      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-card shadow-sm border-border hover:border-accent/20 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-headline">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-headline">Recent ASINs</CardTitle>
              <CardDescription>Latest products added to your monitoring list</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 h-9 w-40 md:w-64"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Link href="/dashboard/asins">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" /> Add ASIN
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="w-[100px]">ASIN</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asins?.filter(a => a.asin_code.toLowerCase().includes(search.toLowerCase())).slice(0, 5).map((asin) => (
                  <TableRow key={asin.id} className="group border-border hover:bg-accent/5 transition-colors">
                    <TableCell className="font-mono text-xs text-accent font-semibold">{asin.asin_code}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{asin.product_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        Monitoring
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">--</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/asin/${asin.asin_code}`}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {asins?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No ASINs found. Start by adding one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right Sidebar - Notifications/AI insights */}
        <div className="space-y-6">
          <Card className="shadow-sm border-accent/20 bg-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 font-headline">
                <AlertTriangle className="h-5 w-5 text-accent" />
                Latest Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts && alerts.length > 0 ? (
                alerts.map((alert) => (
                  <div key={alert.id} className="p-4 rounded-xl bg-card border border-border">
                    <div className="flex justify-between mb-2">
                      <span className="text-xs font-mono text-accent">{alert.asin_code}</span>
                      <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'} className="text-[10px] h-4 uppercase">{alert.severity}</Badge>
                    </div>
                    <p className="text-sm font-semibold mb-1">{alert.alert_type.replace('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground mb-3">{alert.reason}</p>
                    <Link href={`/dashboard/asin/${alert.asin_code}`}>
                      <Button size="sm" variant="outline" className="w-full text-xs h-8 border-accent/20 hover:bg-accent/10">
                        View Details
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm italic">
                  No active alerts detected.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 font-headline">
                <Info className="h-5 w-5 text-primary" />
                Monitoring Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg italic leading-relaxed">
                "Product health is generally stable across your catalog. Consider checking price elasticity for your top 3 ASINs."
              </div>
              <div className="flex items-center gap-3 px-1">
                <Activity className="h-4 w-4 text-accent" />
                <span className="text-xs">System operating at peak efficiency</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
