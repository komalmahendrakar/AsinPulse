
"use client";

import { useParams, useRouter } from "next/navigation";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingDown, ChevronLeft, ArrowUpRight, AlertTriangle, Sparkles, History, ShoppingCart, Box, Star, DollarSign, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart as ReBarChart, Bar } from "recharts";
import { useState, useMemo } from "react";
import { aiSalesDropRootCauseAnalysis, type AiSalesDropRootCauseAnalysisOutput } from "@/ai/flows/ai-sales-drop-root-cause-analysis";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemoFirebase } from "@/firebase/use-memo-firebase";

export default function AsinDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const asin = params.asin as string;
  
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AiSalesDropRootCauseAnalysisOutput | null>(null);

  // Fetch monitoring data for snapshots
  const monitoringQuery = useMemoFirebase(() => {
    if (!firestore || !asin) return null;
    return query(
      collection(firestore, "monitoring_data"),
      where("asin_code", "==", asin),
      orderBy("timestamp", "asc")
    );
  }, [firestore, asin]);
  const { data: monitoringData, loading: monitoringLoading } = useCollection(monitoringQuery);

  // Fetch alerts history for this ASIN
  const alertsQuery = useMemoFirebase(() => {
    if (!firestore || !asin || !user?.uid) return null;
    return query(
      collection(firestore, "alerts"),
      where("asin_code", "==", asin),
      where("user_id", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(10)
    );
  }, [firestore, asin, user?.uid]);
  const { data: asinAlerts } = useCollection(alertsQuery);

  // Fetch daily sales performance
  const salesQuery = useMemoFirebase(() => {
    if (!firestore || !asin) return null;
    return query(
      collection(firestore, "sales_data"),
      where("asin_code", "==", asin),
      orderBy("date", "asc")
    );
  }, [firestore, asin]);
  const { data: salesHistory } = useCollection(salesQuery);

  // Data processing for charts
  const chartData = useMemo(() => {
    if (!monitoringData) return [];
    return monitoringData.map(d => ({
      time: d.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || "",
      fullDate: d.timestamp?.toDate().toLocaleDateString() || "",
      price: d.price,
      stock: d.stock,
      rating: d.rating
    }));
  }, [monitoringData]);

  const salesChartData = useMemo(() => {
    if (!salesHistory) return [];
    return salesHistory.map(s => ({
      date: s.date.split('-').slice(1).join('/'),
      sales: s.units_sold,
      revenue: s.revenue
    }));
  }, [salesHistory]);

  const latestStats = useMemo(() => {
    if (!monitoringData || monitoringData.length === 0) return null;
    return monitoringData[monitoringData.length - 1];
  }, [monitoringData]);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await aiSalesDropRootCauseAnalysis({
        asin: asin,
        salesDropDetails: `Last recorded sales units: ${salesHistory?.[salesHistory.length - 1]?.units_sold || 0}. Analysis triggered due to critical performance drop.`,
        historicalPerformance: `Current Price: $${latestStats?.price || 'N/A'}. Stock Level: ${latestStats?.stock || 0}. Category Rating: ${latestStats?.rating || 'N/A'}.`,
        marketContext: "Automated analysis based on cross-correlated monitoring snapshots and sales velocity."
      });
      setAnalysisResult(result);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setAnalyzing(false);
    }
  };

  if (monitoringLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <p className="text-muted-foreground animate-pulse">Fetching ASIN intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-xl border-border/50 hover:bg-muted">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold font-headline tracking-tight">{asin}</h1>
              {asinAlerts && asinAlerts.length > 0 && asinAlerts[0].status !== 'resolved' && (
                <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 font-bold px-4 py-1">
                  CRITICAL: {asinAlerts[0].alert_type.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <History className="h-4 w-4" /> Last updated: {latestStats?.timestamp?.toDate().toLocaleString() || "Syncing..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-11 rounded-xl px-6 border-accent/20 text-accent font-semibold hover:bg-accent/5">Sync Now</Button>
          <Button className="h-11 rounded-xl px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">Manage Alerts</Button>
        </div>
      </div>

      {/* KPI Highlight Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: "Price", value: latestStats ? `$${latestStats.price}` : "N/A", icon: <DollarSign className="h-5 w-5 text-green-500" /> },
          { label: "Stock", value: latestStats ? latestStats.stock : "N/A", icon: <Box className="h-5 w-5 text-accent" /> },
          { label: "Rating", value: latestStats ? `${latestStats.rating}★` : "N/A", icon: <Star className="h-5 w-5 text-yellow-500" /> },
          { label: "Daily Sales", value: salesHistory && salesHistory.length > 0 ? salesHistory[salesHistory.length - 1].units_sold : "0", icon: <ShoppingCart className="h-5 w-5 text-purple-500" /> },
        ].map((stat, i) => (
          <Card key={i} className="bg-card/50 backdrop-blur-sm shadow-sm border-border/50 hover:border-accent/30 transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                <div className="p-2 rounded-xl bg-muted/50">{stat.icon}</div>
              </div>
              <div className="text-3xl font-bold font-headline">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics & Charts */}
      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 overflow-hidden border-border/50">
          <CardHeader className="border-b bg-muted/20 pb-0">
            <Tabs defaultValue="sales" className="w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <CardTitle className="text-2xl font-headline">Performance History</CardTitle>
                  <CardDescription>Correlation analysis of key operational signals</CardDescription>
                </div>
                <TabsList className="bg-background border h-11 px-1">
                  <TabsTrigger value="sales" className="h-9 px-4">Sales</TabsTrigger>
                  <TabsTrigger value="price" className="h-9 px-4">Price</TabsTrigger>
                  <TabsTrigger value="stock" className="h-9 px-4">Stock</TabsTrigger>
                  <TabsTrigger value="rating" className="h-9 px-4">Rating</TabsTrigger>
                </TabsList>
              </div>
              <div className="h-[400px] w-full pt-4">
                <TabsContent value="sales" className="h-full mt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesChartData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} />
                      <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))'}} />
                      <Area type="monotone" dataKey="sales" stroke="hsl(var(--accent))" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>
                <TabsContent value="price" className="h-full mt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} />
                      <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))'}} />
                      <Line type="stepAfter" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
                <TabsContent value="stock" className="h-full mt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} />
                      <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))'}} />
                      <Bar dataKey="stock" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </ReBarChart>
                  </ResponsiveContainer>
                </TabsContent>
                <TabsContent value="rating" className="h-full mt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} dy={10} />
                      <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} />
                      <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))'}} />
                      <Line type="monotone" dataKey="rating" stroke="hsl(var(--accent))" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
              </div>
            </Tabs>
          </CardHeader>
        </Card>

        {/* AI & Alerts Side Section */}
        <div className="space-y-6">
          <Card className="border-accent/30 bg-accent/5 shadow-lg shadow-accent/5 overflow-hidden">
            <CardHeader className="bg-accent/10 border-b border-accent/20">
              <CardTitle className="text-xl flex items-center gap-2 font-headline">
                <Sparkles className="h-5 w-5 text-accent animate-pulse" />
                Root Cause Analysis
              </CardTitle>
              <CardDescription className="text-accent/80 font-medium">AI Diagnostic Engine</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!analysisResult && !analyzing && (
                <div className="text-center py-6 space-y-4">
                  <div className="p-4 rounded-full bg-accent/10 inline-block">
                    <TrendingDown className="h-8 w-8 text-accent" />
                  </div>
                  <p className="text-sm text-muted-foreground px-4">Evaluate all data points to identify why performance is shifting.</p>
                  <Button onClick={handleRunAnalysis} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-11 rounded-xl font-bold">
                    <Sparkles className="h-4 w-4 mr-2" /> Start AI Analysis
                  </Button>
                </div>
              )}

              {analyzing && (
                <div className="space-y-4 py-4 text-center">
                  <div className="flex items-center justify-center gap-3 text-accent mb-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm font-bold uppercase tracking-wider">Analyzing Patterns...</span>
                  </div>
                  <Skeleton className="h-24 w-full rounded-xl bg-accent/10" />
                </div>
              )}

              {analysisResult && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-5 rounded-2xl bg-card border border-accent/20 shadow-inner">
                    <h5 className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-3">AI Diagnostic Finding</h5>
                    <p className="text-sm leading-relaxed font-medium">{analysisResult.rootCauseSummary}</p>
                  </div>
                  <Button variant="ghost" onClick={() => setAnalysisResult(null)} className="w-full text-xs text-muted-foreground hover:text-foreground">
                    Clear Analysis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Issue Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 pt-0">
              {asinAlerts && asinAlerts.length > 0 ? (
                asinAlerts.map((alert, i) => (
                  <div key={alert.id} className="flex gap-4 py-4 border-b border-border/50 last:border-0 group">
                    <div className="flex flex-col items-center">
                      <div className={`h-2.5 w-2.5 rounded-full ${alert.status === 'resolved' ? 'bg-muted' : 'bg-destructive'} group-hover:scale-125 transition-transform`} />
                      <div className="w-[1px] h-full bg-border/50 mt-1" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">{alert.timestamp?.toDate().toLocaleDateString()}</span>
                        <Badge variant={alert.status === 'resolved' ? 'secondary' : 'outline'} className="text-[8px] h-4">
                          {alert.status === 'resolved' ? 'RESOLVED' : alert.severity}
                        </Badge>
                      </div>
                      <div className="text-sm font-bold leading-tight">{alert.alert_type.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{alert.reason.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-xs italic text-muted-foreground">No critical events recorded for this catalog ID.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

