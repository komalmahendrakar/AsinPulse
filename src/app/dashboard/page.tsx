
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Package, TrendingUp, TrendingDown, Search, Plus, ExternalLink, Activity, Info } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const MOCK_ASINS = [
  { asin: "B00X4WHP5E", name: "Premium Leather Headphones", price: "$129.99", rank: 142, status: "Healthy", trend: "up", change: "+12%" },
  { asin: "B09G96TFFG", name: "Smart Home Security Hub", price: "$89.50", rank: 3241, status: "At Risk", trend: "down", change: "-24%" },
  { asin: "B0C6N9K2Y7", name: "Ergonomic Office Chair - Mesh", price: "$299.00", rank: 89, status: "Healthy", trend: "up", change: "+5%" },
  { asin: "B0BHZMC8P1", name: "Minimalist Desk Lamp Pro", price: "$45.00", rank: 15402, status: "Critical", trend: "down", change: "-68%" },
  { asin: "B09S7MBSL7", name: "Fast Charging Dock", price: "$19.99", rank: 452, status: "Healthy", trend: "up", change: "+2%" },
];

export default function DashboardOverview() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* KPI Section */}
      <div className="grid md:grid-cols-4 gap-6">
        {[
          { label: "Tracked ASINs", value: "24", sub: "2 added this week", icon: <Package className="h-5 w-5 text-accent" /> },
          { label: "Active Alerts", value: "3", sub: "2 high priority", icon: <AlertTriangle className="h-5 w-5 text-destructive" /> },
          { label: "Avg. Rank Change", value: "+14.2%", sub: "Across all categories", icon: <TrendingUp className="h-5 w-5 text-green-500" /> },
          { label: "Monitoring Hours", value: "1,452", sub: "Uptime 99.99%", icon: <Activity className="h-5 w-5 text-primary" /> },
        ].map((stat, i) => (
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
              <CardTitle className="text-xl font-headline">Recent Performance</CardTitle>
              <CardDescription>Real-time health status of your prioritized ASINs</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search ASIN..." 
                  className="pl-9 h-9 w-40 md:w-64"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" /> Add ASIN
              </Button>
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
                  <TableHead className="text-right">Trend</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_ASINS.filter(a => a.asin.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase())).map((asin) => (
                  <TableRow key={asin.asin} className="group border-border hover:bg-accent/5 transition-colors">
                    <TableCell className="font-mono text-xs text-accent font-semibold">{asin.asin}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{asin.name}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={asin.status === "Healthy" ? "default" : asin.status === "At Risk" ? "secondary" : "destructive"}
                        className={`rounded-md px-2 py-0 ${asin.status === 'Healthy' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}`}
                      >
                        {asin.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{asin.price}</TableCell>
                    <TableCell className="text-right">
                      <div className={`flex items-center justify-end gap-1.5 ${asin.trend === 'up' ? 'text-green-500' : 'text-destructive'}`}>
                        {asin.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        <span className="text-sm font-semibold">{asin.change}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/asin/${asin.asin}`}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right Sidebar - Notifications/AI insights */}
        <div className="space-y-6">
          <Card className="shadow-sm border-accent/20 bg-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 font-headline">
                <TrendingDown className="h-5 w-5 text-destructive" />
                Urgent Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-card border border-border">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-mono text-accent">B0BHZMC8P1</span>
                  <Badge variant="destructive" className="text-[10px] h-4">Critical Drop</कर्णी>
                </div>
                <p className="text-sm font-semibold mb-1">Sales velocity dropped 68%</p>
                <p className="text-xs text-muted-foreground mb-3">Detected: 2 hours ago</p>
                <Link href="/dashboard/asin/B0BHZMC8P1">
                  <Button size="sm" variant="outline" className="w-full text-xs h-8 border-accent/20 hover:bg-accent/10">
                    Analyze Root Cause
                  </Button>
                </Link>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-mono text-accent">B09G96TFFG</span>
                  <Badge variant="secondary" className="text-[10px] h-4">Price War</Badge>
                </div>
                <p className="text-sm font-semibold mb-1">Buy Box lost to competitor</p>
                <p className="text-xs text-muted-foreground mb-3">Detected: 6 hours ago</p>
                <Link href="/dashboard/asin/B09G96TFFG">
                  <Button size="sm" variant="outline" className="w-full text-xs h-8 border-accent/20 hover:bg-accent/10">
                    View Mitigation Steps
                  </Button>
                </Link>
              </div>
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
              <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg italic">
                "We noticed a market-wide dip in the Home Office category this weekend. Competitor pricing is stabilizing."
              </div>
              <div className="flex items-center gap-3 px-1">
                <Activity className="h-4 w-4 text-accent" />
                <span className="text-xs">Next sync in 4 minutes</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
