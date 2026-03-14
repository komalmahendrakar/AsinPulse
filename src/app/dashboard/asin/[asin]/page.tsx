
"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingDown, ChevronLeft, ArrowUpRight, BarChart, AlertTriangle, Sparkles, History, ShoppingCart } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useState } from "react";
import { aiSalesDropRootCauseAnalysis, type AiSalesDropRootCauseAnalysisOutput } from "@/ai/flows/ai-sales-drop-root-cause-analysis";
import { Skeleton } from "@/components/ui/skeleton";

const PERFORMANCE_DATA = [
  { date: "Oct 01", sales: 45, rank: 120 },
  { date: "Oct 05", sales: 52, rank: 110 },
  { date: "Oct 10", sales: 48, rank: 115 },
  { date: "Oct 15", sales: 55, rank: 98 },
  { date: "Oct 20", sales: 60, rank: 85 },
  { date: "Oct 25", sales: 30, rank: 250 }, // Drop occurs
  { date: "Oct 28", sales: 12, rank: 450 },
  { date: "Oct 30", sales: 8, rank: 580 },
];

export default function AsinDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const asin = params.asin as string;
  
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AiSalesDropRootCauseAnalysisOutput | null>(null);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await aiSalesDropRootCauseAnalysis({
        asin: asin,
        salesDropDetails: "Observed a 75% drop in sales velocity over the last 5 days. Daily units decreased from 60 to less than 10. Buy box ownership dropped from 100% to 45%.",
        historicalPerformance: "Average daily units: 50. Average Sales Rank: #100. Price stability: High (maintained at $129.99 for 6 months).",
        marketContext: "Increased competitor advertising spend detected in the 'Wireless Headphones' category. Two new entrants with 20% lower pricing appeared last week."
      });
      setAnalysisResult(result);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumb / Top Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-headline">{asin}</h1>
              <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 font-semibold px-3">CRITICAL DROP</Badge>
            </div>
            <p className="text-muted-foreground mt-1">Premium Leather Headphones • Electronics Category</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-accent/20">Sync Data</Button>
          <Button className="bg-primary hover:bg-primary/90">Edit Monitored Thresholds</Button>
        </div>
      </div>

      {/* KPI Highlight Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        {[
          { label: "Current Price", value: "$129.99", change: "0%", color: "text-muted-foreground", icon: <ShoppingCart className="h-4 w-4" /> },
          { label: "Sales Rank", value: "#580", change: "-482 spots", color: "text-destructive", icon: <BarChart className="h-4 w-4" /> },
          { label: "Buy Box %", value: "42%", change: "-58%", color: "text-destructive", icon: <TrendingDown className="h-4 w-4" /> },
          { label: "Conversion Rate", value: "2.4%", change: "-8.1%", color: "text-destructive", icon: <ArrowUpRight className="h-4 w-4 rotate-90" /> },
        ].map((stat, i) => (
          <Card key={i} className="bg-card shadow-sm border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">{stat.label}</span>
                <div className="p-1.5 rounded-md bg-muted/50">{stat.icon}</div>
              </div>
              <div className="text-2xl font-bold font-headline">{stat.value}</div>
              <div className={`text-xs mt-1 font-semibold ${stat.color}`}>{stat.change} vs. last 7 days</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analysis and Charts */}
      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Tabs defaultValue="sales" className="w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-headline">Performance History</CardTitle>
                  <CardDescription>Sales velocity and category rank correlation</CardDescription>
                </div>
                <TabsList className="bg-muted/50 border border-border">
                  <TabsTrigger value="sales" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sales Volume</TabsTrigger>
                  <TabsTrigger value="rank" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">BSR Trend</TabsTrigger>
                </TabsList>
              </div>
              <div className="mt-8 h-[400px]">
                <TabsContent value="sales" className="h-full mt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={PERFORMANCE_DATA}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))'}}
                        itemStyle={{color: 'hsl(var(--accent))'}}
                      />
                      <Area type="monotone" dataKey="sales" stroke="hsl(var(--accent))" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>
                <TabsContent value="rank" className="h-full mt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={PERFORMANCE_DATA}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                      <YAxis reversed axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                      <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))'}} />
                      <Line type="monotone" dataKey="rank" stroke="hsl(var(--destructive))" strokeWidth={3} dot={{r: 4, fill: 'hsl(var(--destructive))'}} />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
              </div>
            </Tabs>
          </CardHeader>
        </Card>

        {/* AI Root Cause Panel */}
        <div className="space-y-6">
          <Card className="border-accent/40 bg-accent/5 overflow-hidden shadow-lg shadow-accent/5">
            <CardHeader className="bg-accent/10 border-b border-accent/20">
              <CardTitle className="text-xl flex items-center gap-2 font-headline">
                <Sparkles className="h-5 w-5 text-accent animate-pulse" />
                Root Cause Analysis
              </CardTitle>
              <CardDescription className="text-accent/80">AI-powered diagnostic engine</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!analysisResult && !analyzing && (
                <div className="text-center py-10">
                  <div className="mb-4 p-4 rounded-full bg-accent/10 inline-block">
                    <AlertTriangle className="h-8 w-8 text-accent" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2 font-headline">Identify Performance Loss</h4>
                  <p className="text-sm text-muted-foreground mb-6">Let our AI analyze historical trends, buy box ownership, and competitor movements to find the issue.</p>
                  <Button onClick={handleRunAnalysis} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <Sparkles className="h-4 w-4 mr-2" /> Start AI Analysis
                  </Button>
                </div>
              )}

              {analyzing && (
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-3 text-accent mb-4">
                    <div className="h-2 w-2 bg-accent rounded-full animate-ping" />
                    <span className="text-sm font-semibold">Correlating competitor data...</span>
                  </div>
                  <Skeleton className="h-4 w-full bg-accent/10" />
                  <Skeleton className="h-4 w-3/4 bg-accent/10" />
                  <Skeleton className="h-4 w-1/2 bg-accent/10" />
                  <div className="pt-6 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                  </div>
                </div>
              )}

              {analysisResult && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-4 rounded-xl bg-card border border-accent/20">
                    <h5 className="text-sm font-bold text-accent uppercase tracking-wider mb-2">Findings Summary</h5>
                    <p className="text-sm leading-relaxed">{analysisResult.rootCauseSummary}</p>
                  </div>
                  
                  {analysisResult.suggestedActions && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                        <History className="h-4 w-4 text-accent" /> Suggested Actions
                      </h5>
                      <ul className="space-y-2">
                        {analysisResult.suggestedActions.map((action, i) => (
                          <li key={i} className="text-sm flex gap-3 p-3 rounded-lg bg-card/50 border border-border items-start">
                            <div className="h-5 w-5 rounded-full bg-accent/10 text-accent flex-shrink-0 flex items-center justify-center text-[10px] font-bold">
                              {i + 1}
                            </div>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <Button variant="outline" onClick={() => setAnalysisResult(null)} className="w-full text-xs">
                    Re-run Analysis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Alert History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { date: "Oct 28, 2024", msg: "Sales Velocity < 10 units/day" },
                { date: "Oct 26, 2024", msg: "Buy Box Lost (Competitor pricing lower)" },
                { date: "Sep 12, 2024", msg: "Inventory reaching reorder point" },
              ].map((alert, i) => (
                <div key={i} className="flex justify-between items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="text-xs font-semibold">{alert.msg}</div>
                  <div className="text-[10px] text-muted-foreground whitespace-nowrap">{alert.date}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
