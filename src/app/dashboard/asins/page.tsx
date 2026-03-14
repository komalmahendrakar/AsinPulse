
"use client";

import { useState } from "react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, addDoc, query, where, orderBy, serverTimestamp, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, Loader2, Package, Search, RefreshCw, AlertTriangle } from "lucide-react";
import { useMemoFirebase } from "@/firebase/use-memo-firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function AsinsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [singleAsin, setSingleAsin] = useState("");
  const [bulkAsins, setBulkAsins] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch ASINs for the current user
  const asinsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "asins"),
      where("user_id", "==", user.uid),
      orderBy("created_at", "desc")
    );
  }, [firestore, user?.uid]);

  const { data: asins, loading } = useCollection(asinsQuery);

  const handleSyncAll = async () => {
    if (!firestore || !user?.uid || !asins || asins.length === 0) return;
    setIsSyncing(true);
    
    try {
      const monitoringRef = collection(firestore, "monitoring_data");
      const salesRef = collection(firestore, "sales_data");
      const alertsRef = collection(firestore, "alerts");
      
      let alertsCount = 0;

      for (const item of asins) {
        // 1. Generate & Save Monitoring Signals
        const mockMonitoring = {
          asin_code: item.asin_code,
          timestamp: serverTimestamp(),
          price: 99 + Math.random() * 150,
          stock: Math.floor(Math.random() * 50),
          buybox_owner: Math.random() > 0.8 ? "Competitor Store" : "Amazon.com",
          delivery_days: Math.floor(Math.random() * 4) + 1,
          rating: 4 + Math.random()
        };

        addDoc(monitoringRef, mockMonitoring).catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: "monitoring_data",
            operation: "create",
            requestResourceData: mockMonitoring,
          }));
        });

        // 2. Generate Mock Sales History for Detection (Last 7 days + Today)
        const dailyAverage = 50 + Math.random() * 20;
        const salesHistory = [];
        let sevenDayTotal = 0;

        for (let i = 1; i <= 7; i++) {
          const units = Math.floor(dailyAverage * (0.8 + Math.random() * 0.4));
          sevenDayTotal += units;
          salesHistory.push(units);
        }

        const sevenDayAvg = sevenDayTotal / 7;
        
        // Simulate a drop for 30% of syncs to demonstrate the feature
        const shouldDrop = Math.random() > 0.7;
        const todaySales = shouldDrop 
          ? Math.floor(sevenDayAvg * 0.4) // 60% drop
          : Math.floor(dailyAverage * (0.8 + Math.random() * 0.4));

        // Save Today's Sales Data
        const todaySalesData = {
          asin_code: item.asin_code,
          date: new Date().toISOString().split('T')[0],
          units_sold: todaySales,
          revenue: todaySales * mockMonitoring.price,
          user_id: user.uid
        };

        addDoc(salesRef, todaySalesData).catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: "sales_data",
            operation: "create",
            requestResourceData: todaySalesData,
          }));
        });

        // 3. Sales Drop Detection Logic
        // today_sales < (7_day_average_sales * 0.7)
        if (todaySales < (sevenDayAvg * 0.7)) {
          const dropPercentage = Math.round(((sevenDayAvg - todaySales) / sevenDayAvg) * 100);
          
          const alertData = {
            user_id: user.uid,
            asin_code: item.asin_code,
            alert_type: "SALES_DROP",
            reason: `Critical sales drop detected: ${dropPercentage}% below 7-day average (${Math.round(sevenDayAvg)} units/day).`,
            severity: "high",
            timestamp: serverTimestamp(),
          };

          addDoc(alertsRef, alertData).catch(async () => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
               path: "alerts",
               operation: "create",
               requestResourceData: alertData,
             }));
          });
          alertsCount++;
        }
      }

      toast({
        title: "Sync & Detection Complete",
        description: `Analyzed ${asins.length} products. Detected ${alertsCount} new sales drops.`,
      });
    } catch (error) {
      console.error("Sync failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddAsins = async (asinList: string[]) => {
    if (!firestore || !user?.uid || asinList.length === 0) return;
    
    setIsAdding(true);
    
    try {
      const promises = asinList.map(async (code) => {
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) return;

        const docData = {
          user_id: user.uid,
          asin_code: cleanCode,
          product_name: "Retrieved Product Name", 
          created_at: serverTimestamp(),
          status: "Monitoring"
        };

        return addDoc(collection(firestore, "asins"), docData)
          .catch(async (err) => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
               path: "asins",
               operation: "create",
               requestResourceData: docData,
             }));
          });
      });

      await Promise.all(promises);
      
      toast({
        title: "Success",
        description: `Added ${asinList.length} ASIN(s) to monitoring.`,
      });
      
      setSingleAsin("");
      setBulkAsins("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add some ASINs.",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleAsin.trim()) return;
    handleAddAsins([singleAsin.trim()]);
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const list = bulkAsins
      .split(/[\n,]+/)
      .map(a => a.trim())
      .filter(a => a.length > 0);
    
    if (list.length === 0) return;
    handleAddAsins(list);
  };

  const filteredAsins = asins?.filter(a => 
    a.asin_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Add ASIN Forms */}
        <div className="w-full md:w-1/3 space-y-6">
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <Plus className="h-4 w-4 text-accent" />
                Add Single ASIN
              </CardTitle>
              <CardDescription>Enter a single Amazon Standard ID</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSingleSubmit} className="flex gap-2">
                <Input 
                  placeholder="e.g. B00X4WHP5E" 
                  value={singleAsin}
                  onChange={(e) => setSingleAsin(e.target.value)}
                  disabled={isAdding}
                />
                <Button type="submit" disabled={isAdding || !singleAsin}>
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <Upload className="h-4 w-4 text-accent" />
                Bulk Import
              </CardTitle>
              <CardDescription>Paste multiple ASINs separated by commas or new lines</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <Textarea 
                  placeholder="B00X4WHP5E&#10;B09G96TFFG&#10;B0C6N9K2Y7" 
                  className="min-h-[120px] font-mono text-sm"
                  value={bulkAsins}
                  onChange={(e) => setBulkAsins(e.target.value)}
                  disabled={isAdding}
                />
                <Button type="submit" className="w-full bg-primary" disabled={isAdding || !bulkAsins}>
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Import ASINs"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ASIN Table */}
        <div className="flex-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-xl font-headline">Monitored Catalog</CardTitle>
                <CardDescription>Currently tracking {asins?.length || 0} products</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-accent/20 h-9" 
                  onClick={handleSyncAll}
                  disabled={isSyncing || asins?.length === 0}
                >
                  {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Sync & Detect Drops
                </Button>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search..." 
                    className="pl-9 w-32 md:w-48 h-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ASIN</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                      </TableCell>
                    </TableRow>
                  ) : filteredAsins?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>No ASINs found. Add some to start monitoring.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAsins?.map((item) => (
                      <TableRow key={item.id} className="group cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => window.location.href = `/dashboard/asin/${item.asin_code}`}>
                        <TableCell className="font-mono text-xs font-bold text-accent">{item.asin_code}</TableCell>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {item.product_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.created_at?.toDate().toLocaleDateString() || "Just now"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20">
                            {item.status || "Monitoring"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
