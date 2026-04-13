"use client";

import { useParams, useRouter } from "next/navigation";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { orderBy, limit, collection, query, where, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingDown, ChevronLeft, AlertTriangle, Sparkles, Box, Star, Loader2, RefreshCw, MessageSquare, ShoppingCart, Store, CheckCircle2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart as ReBarChart, Bar } from "recharts";
import { useState, useMemo } from "react";
import { aiSalesDropRootCauseAnalysis, type AiSalesDropRootCauseAnalysisOutput } from "@/ai/flows/ai-sales-drop-root-cause-analysis";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemoFirebase } from "@/firebase/use-memo-firebase";
import { syncAsin } from "@/app/actions/syncAsin";
import { useToast } from "@/hooks/use-toast";

export default function AsinDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const asin = (params.asin as string)?.toUpperCase().trim();
  
  const [analyzing, setAnalyzing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AiSalesDropRootCauseAnalysisOutput | null>(null);

  // Fetch monitored ASIN data
  const asinsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !asin) return null;
    return query(
      collection(firestore, "asins"),
      where("user_id", "==", user.uid),
      where("asin_code", "==", asin),
      limit(1)
    );
  }, [firestore, user?.uid, asin]);
  const { data: monitoredAsinList, loading: monitoredLoading } = useCollection(asinsQuery);
  const monitoredAsin = monitoredAsinList?.[0];

  // Fetch historical snapshots
  const monitoringQuery = useMemoFirebase(() => {
    if (!firestore || !asin) return null;
    return query(
      collection(firestore, "monitoring_data"),
      where("asin_code", "==", asin),
      orderBy("timestamp", "asc")
    );
  }, [firestore, asin]);
  const { data: monitoringData } = useCollection(monitoringQuery);

  // Fetch alerts
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

  // Fetch sales performance
  const salesQuery = useMemoFirebase(() => {
    if (!firestore || !asin) return null;
    return query(
      collection(firestore, "sales_data"),
      where("asin_code", "==", asin),
      orderBy("date", "asc")
    );
  }, [firestore, asin]);
  const { data: salesHistory } = useCollection(salesQuery);

  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) return null;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const chartData = useMemo(() => {
    if (!monitoringData) return [];
    return monitoringData.map(d => ({
      time: d.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || "",
      price: d.price,
      stock: typeof d.stock === 'number' ? d.stock : (d.stock?.toLowerCase().includes('in stock') ? 100 : 0),
      rating: d.rating,
    }));
  }, [monitoringData]);

  const salesChartData = useMemo(() => {
    if (!salesHistory) return [];
    return salesHistory.map(s => ({
      date: s.date.split('-').slice(1).join('/'),
      sales: s.units_sold,
    }));
  }, [salesHistory]);

  const handleSyncNow = async () => {
    if (!user?.uid || !asin || !firestore) return;
    setSyncing(true);
    try {
      const result = await syncAsin(asin, user.uid);
      
      if (result.success && result.data) {
        const asinsRef = collection(firestore, "asins");
        const q = query(asinsRef, where("user_id", "==", user.uid), where("asin_code", "==", asin));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          await updateDoc(snapshot.docs[0].ref, {
            ...result.data,
            lastUpdated: serverTimestamp(),
            lastSyncedAt: serverTimestamp()
          });
        }
        toast({ title: "Sync Successful", description: `Updated Amazon India data for ${asin}` });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: error.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!asin) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await aiSalesDropRootCauseAnalysis({
        asin: asin,
        salesDropDetails: `Current stock status: ${monitoredAsin?.stock || 'Unknown'}. Latest sales check recorded ${salesHistory?.length ? salesHistory[salesHistory.length - 1].units_sold : 'minimal'} units.`,
        historicalPerformance: `Price: ${formatPrice(monitoredAsin?.price) || 'N/A'}. Rating: ${monitoredAsin?.rating || 'N/A'} based on ${monitoredAsin?.reviews || 0} reviews.`,
        marketContext: "Analyzing signals within the Amazon India marketplace context."
      });
      setAnalysisResult(result);
      toast({ title: "Analysis Complete", description: "AI has identified the operational root cause." });
    } catch (error: any) {
      console.error("Analysis failed", error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message || "The AI analysis encountered an error. Please check your API configuration."
      });
    } finally {
      setAnalyzing(false);
    }
  };

  if (monitoredLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <p className="text-muted-foreground">Accessing catalog...</p>
      </div>
    );
  }

  // UI rendering logic for Rating to distinguish between 0 reviews and unsynced data
  const renderRatingValue = () => {
    if (monitoredAsin?.reviews === 0) return "No ratings yet";
    if (monitoredAsin?.rating !== undefined && monitoredAsin?.rating !== null) {
      return `${monitoredAsin.rating}★`;
    }
    return null;
  };

  const isRatingSyncRequired = () => {
    if (monitoredAsin?.reviews === 0) return false;
    if (monitoredAsin?.rating !== undefined && monitoredAsin?.rating !== null) return false;
    return true;
  };

  const kpis = [
    { label: "Price", value: formatPrice(monitoredAsin?.price), icon: <span className="text-lg font-bold text-green-500">₹</span>, syncRequired: !monitoredAsin?.price },
    { label: "Stock", value: monitoredAsin?.stock, icon: <Box className="h-5 w-5 text-accent" />, syncRequired: !monitoredAsin?.stock },
    { label: "Rating", value: renderRatingValue(), icon: <Star className="h-5 w-5 text-yellow-500" />, syncRequired: isRatingSyncRequired() },
    { label: "Reviews", value: monitoredAsin?.reviews !== undefined && monitoredAsin?.reviews !== null ? monitoredAsin.reviews.toLocaleString() : (monitoredAsin?.reviews === 0 ? "0" : null), icon: <MessageSquare className="h-5 w-5 text-blue-500" />, syncRequired: monitoredAsin?.reviews === undefined || monitoredAsin?.reviews === null },
    { label: "Sold By", value: monitoredAsin?.sold_by || (monitoredAsin?.price ? "Amazon.in" : null), icon: <Store className="h-5 w-5 text-orange-500" />, syncRequired: !monitoredAsin?.price && !monitoredAsin?.sold_by },
    { label: "Daily Sales", value: salesHistory?.length ? salesHistory[salesHistory.length - 1].units_sold : null, icon: <ShoppingCart className="h-5 w-5 text-purple-500" />, syncRequired: !salesHistory?.length },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-xl">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold font-headline tracking-tight uppercase">{asin}</h1>
              {asinAlerts?.[0]?.status !== 'resolved' && asinAlerts?.[0] && (
                <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 font-bold">
                  {asinAlerts[0].alert_type.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 font-medium max-w-xl truncate">
              {monitoredAsin?.product_name || monitoredAsin?.title || "Sync required to fetch product title"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="h-11 rounded-xl px-6 border-accent/20 text-accent font-semibold"
            onClick={handleSyncNow}
            disabled={syncing}
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
          <Button className="h-11 rounded-xl px-6 bg-primary">Manage Alerts</Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {kpis.map((stat, i) => (
          <Card key={i} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-accent/30 transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                <div className="p-2 rounded-xl bg-muted/50">{stat.icon}</div>
              </div>
              <div className="text-lg font-bold font-headline truncate">
                {stat.syncRequired ? (
                  <span className="text-[10px] text-muted-foreground italic font-normal">Sync Data</span>
                ) : (
                  stat.value
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="border-b bg-muted/20">
            <Tabs defaultValue="sales" className="w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <CardTitle className="text-2xl font-headline">Performance History</CardTitle>
                  <CardDescription>Amazon India catalog trends</CardDescription>
                </div>
                <TabsList className="bg-background border">
                  <TabsTrigger value="sales">Sales</TabsTrigger>
                  <TabsTrigger value="price">Price</TabsTrigger>
                  <TabsTrigger value="stock">Stock</TabsTrigger>
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
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderRadius: '12px'}} />
                      <Area type="monotone" dataKey="sales" stroke="hsl(var(--accent))" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>
                <TabsContent value="price" className="h-full mt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderRadius: '12px'}} />
                      <Line type="stepAfter" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
                <TabsContent value="stock" className="h-full mt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderRadius: '12px'}} />
                      <Bar dataKey="stock" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </ReBarChart>
                  </ResponsiveContainer>
                </TabsContent>
              </div>
            </Tabs>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          <Card className="border-accent/30 bg-accent/5 overflow-hidden">
            <CardHeader className="bg-accent/10 border-b border-accent/20">
              <CardTitle className="text-xl flex items-center gap-2 font-headline">
                <Sparkles className="h-5 w-5 text-accent" />
                Root Cause Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {!analysisResult && !analyzing && (
                <div className="text-center py-6 space-y-4">
                  <TrendingDown className="h-8 w-8 text-accent mx-auto" />
                  <p className="text-sm text-muted-foreground px-4">Identify why performance is shifting in the Indian market.</p>
                  <Button onClick={handleRunAnalysis} className="w-full bg-accent text-accent-foreground font-bold h-11 rounded-xl">
                    <Sparkles className="h-4 w-4 mr-2" /> Start AI Analysis
                  </Button>
                </div>
              )}

              {analyzing && (
                <div className="space-y-4 py-4 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-accent mx-auto" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full rounded bg-accent/10" />
                    <Skeleton className="h-4 w-3/4 rounded bg-accent/10 mx-auto" />
                    <Skeleton className="h-20 w-full rounded-xl bg-accent/5 mt-4" />
                  </div>
                </div>
              )}

              {analysisResult && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-5 rounded-2xl bg-card border border-accent/20 shadow-inner">
                    <h5 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-3">AI Diagnostic Finding</h5>
                    <p className="text-sm leading-relaxed font-medium">{analysisResult.rootCauseSummary}</p>
                  </div>
                  
                  {analysisResult.suggestedActions && analysisResult.suggestedActions.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Suggested Actions</h5>
                      <div className="space-y-2">
                        {analysisResult.suggestedActions.map((action, i) => (
                          <div key={i} className="flex gap-3 p-3 rounded-xl bg-background border border-border/50 text-xs">
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                            <span>{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button variant="ghost" onClick={() => setAnalysisResult(null)} className="w-full text-xs text-muted-foreground hover:text-accent">
                    Clear Analysis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Issue Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {asinAlerts?.length ? (
                asinAlerts.map((alert) => (
                  <div key={alert.id} className="flex gap-4 py-4 border-b border-border/50 last:border-0">
                    <div className="flex flex-col items-center">
                      <div className={`h-2.5 w-2.5 rounded-full ${alert.status === 'resolved' ? 'bg-muted' : 'bg-destructive'}`} />
                      <div className="w-[1px] h-full bg-border/50 mt-1" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-muted-foreground">{alert.timestamp?.toDate().toLocaleDateString()}</span>
                        <Badge variant={alert.status === 'resolved' ? 'secondary' : 'outline'} className="text-[8px] h-4">
                          {alert.status === 'resolved' ? 'RESOLVED' : alert.severity}
                        </Badge>
                      </div>
                      <div className="text-sm font-bold">{alert.alert_type.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{alert.reason.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-xs italic text-muted-foreground">No critical events recorded for this Indian catalog ID.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
