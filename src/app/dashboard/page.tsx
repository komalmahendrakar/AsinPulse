
"use client";

import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Package, TrendingDown, Search, ExternalLink, Activity, AlertTriangle, BarChart3, DollarSign, Box, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useMemoFirebase } from "@/firebase/use-memo-firebase";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

// Mock portfolio aggregate data for visual representation
const PORTFOLIO_TREND_DATA = [
  { time: "08:00", sales: 120, price: 124.5, stock: 450 },
  { time: "10:00", sales: 140, price: 124.5, stock: 432 },
  { time: "12:00", sales: 90, price: 124.5, stock: 410 },
  { time: "14:00", sales: 85, price: 129.9, stock: 395 },
  { time: "16:00", sales: 110, price: 129.9, stock: 380 },
  { time: "18:00", sales: 135, price: 129.9, stock: 365 },
  { time: "20:00", sales: 155, price: 129.9, stock: 340 },
];

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
    return query(
      collection(firestore, "alerts"), 
      where("user_id", "==", user.uid), 
      orderBy("timestamp", "desc")
    );
  }, [firestore, user?.uid]);

  const { data: asins } = useCollection(asinsQuery);
  const { data: alerts } = useCollection(alertsQuery);

  // Derive Insights
  const stats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const totalAsins = asins?.length || 0;
    const activeAlerts = alerts?.length || 0;
    const salesDropsToday = alerts?.filter(a => 
      a.alert_type === "SALES_DROP" && 
      a.timestamp?.toDate() >= todayStart
    ).length || 0;
    const criticalIssues = alerts?.filter(a => a.severity === "high").length || 0;

    return [
      { label: "Total ASINs", value: totalAsins, sub: "Actively monitored", icon: <Package className="h-5 w-5 text-accent" /> },
      { label: "Active Alerts", value: activeAlerts, sub: "Pending review", icon: <AlertTriangle className="h-5 w-5 text-yellow-500" /> },
      { label: "Sales Drops Today", value: salesDropsToday, sub: "Velocity alerts", icon: <TrendingDown className="h-5 w-5 text-destructive" /> },
      { label: "Critical Issues", value: criticalIssues, sub: "Requires attention", icon: <ShieldAlert className="h-5 w-5 text-red-500" /> },
    ];
  }, [asins, alerts]);

  const filteredAsins = asins?.filter(a => 
    a.asin_code.toLowerCase().includes(search.toLowerCase()) ||
    a.product_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* KPI Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-card shadow-sm border-border overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</CardTitle>
              <div className="p-2 bg-muted/50 rounded-lg">{stat.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{stat.value}</div>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-headline">Portfolio Intelligence</CardTitle>
              <CardDescription>Aggregate trends across all monitored products</CardDescription>
            </div>
            <Tabs defaultValue="sales" className="w-auto">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="sales" className="gap-2"><BarChart3 className="h-3.5 w-3.5" /> Sales</TabsTrigger>
                <TabsTrigger value="price" className="gap-2"><DollarSign className="h-3.5 w-3.5" /> Price</TabsTrigger>
                <TabsTrigger value="stock" className="gap-2"><Box className="h-3.5 w-3.5" /> Stock</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] mt-4">
            <Tabs defaultValue="sales" className="h-full">
              <TabsContent value="sales" className="h-full mt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={PORTFOLIO_TREND_DATA}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} />
                    <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}} />
                    <Area type="monotone" dataKey="sales" stroke="hsl(var(--accent))" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="price" className="h-full mt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={PORTFOLIO_TREND_DATA}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} />
                    <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}} />
                    <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="stock" className="h-full mt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={PORTFOLIO_TREND_DATA}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} />
                    <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}} />
                    <Bar dataKey="stock" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Catalog Table */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-6">
            <div>
              <CardTitle className="text-xl font-headline">Monitored ASINs</CardTitle>
              <CardDescription>Performance status for your catalog</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="pl-9 h-9 w-40 md:w-64 bg-muted/30"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-bold">ASIN</TableHead>
                  <TableHead className="font-bold">Product Name</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAsins?.slice(0, 5).map((asin) => (
                  <TableRow key={asin.id} className="group hover:bg-muted/20 transition-colors">
                    <TableCell className="font-mono text-xs text-accent font-bold">{asin.asin_code}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{asin.product_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-500 bg-green-500/5 border-green-500/20 px-3 py-1">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/asin/${asin.asin_code}`}>
                        <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredAsins || filteredAsins.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                      No ASINs found. Add some in the monitoring page.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Latest Alerts Column */}
        <div className="space-y-6">
          <Card className="shadow-sm border-accent/20 bg-accent/5">
            <CardHeader className="pb-3 border-b border-accent/10">
              <CardTitle className="text-lg flex items-center gap-2 font-headline">
                <Activity className="h-5 w-5 text-accent" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {alerts && alerts.length > 0 ? (
                alerts.slice(0, 4).map((alert) => (
                  <div key={alert.id} className="p-4 rounded-xl bg-card border border-border hover:border-accent/30 transition-all cursor-default">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-tighter">{alert.asin_code}</span>
                      <Badge variant={alert.severity === 'high' ? 'destructive' : 'outline'} className="text-[9px] h-4 uppercase">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm font-bold mb-1">{alert.alert_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{alert.reason.replace(/_/g, ' ')}</p>
                    <Link href={`/dashboard/asin/${alert.asin_code}`}>
                      <button className="w-full text-xs h-8 border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors font-semibold">
                        Analyze Issue
                      </button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Activity className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-xs italic">No critical events detected.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
