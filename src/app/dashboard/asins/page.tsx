
"use client";

import { useState } from "react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, addDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, Loader2, RefreshCw } from "lucide-react";
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
    if (!firestore || !user?.uid || !user?.email || !asins || asins.length === 0) return;
    setIsSyncing(true);
    
    try {
      const monitoringRef = collection(firestore, "monitoring_data");
      const salesRef = collection(firestore, "sales_data");
      const alertsRef = collection(firestore, "alerts");
      const mailRef = collection(firestore, "mail");
      
      let alertsCount = 0;

      for (const item of asins) {
        // 1. Generate & Save Monitoring Signals
        const isOutOfStock = Math.random() > 0.8;
        const buyBoxLost = Math.random() > 0.85;
        const priceHike = Math.random() > 0.9;
        const shippingDelay = Math.random() > 0.9;
        const badReview = Math.random() > 0.95;

        const currentPrice = priceHike ? 159.99 : 124.99;
        const mockMonitoring = {
          asin_code: item.asin_code,
          timestamp: serverTimestamp(),
          price: currentPrice,
          stock: isOutOfStock ? 0 : Math.floor(Math.random() * 50) + 1,
          buybox_owner: buyBoxLost ? "Competitor Prime" : "Your Store",
          delivery_days: shippingDelay ? 7 : 2,
          rating: badReview ? 3.5 : 4.8
        };

        addDoc(monitoringRef, mockMonitoring).catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: "monitoring_data",
            operation: "create",
            requestResourceData: mockMonitoring,
          }));
        });

        // 2. Generate Sales History
        const dailyAverage = 50;
        const hasIssue = isOutOfStock || buyBoxLost || priceHike || shippingDelay || badReview;
        const todaySales = hasIssue 
          ? Math.floor(dailyAverage * 0.2) 
          : Math.floor(dailyAverage * (0.9 + Math.random() * 0.2));

        const todaySalesData = {
          asin_code: item.asin_code,
          date: new Date().toISOString().split('T')[0],
          units_sold: todaySales,
          revenue: todaySales * currentPrice,
          user_id: user.uid
        };

        addDoc(salesRef, todaySalesData).catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: "sales_data",
            operation: "create",
            requestResourceData: todaySalesData,
          }));
        });

        // 3. Sales Drop Detection & Root Cause Analysis & Email Alerts
        if (todaySales < (dailyAverage * 0.7)) {
          let reason = "UNSPECIFIED_TREND";
          
          if (mockMonitoring.stock === 0) reason = "OUT_OF_STOCK";
          else if (mockMonitoring.buybox_owner !== "Your Store") reason = "BUYBOX_LOST";
          else if (mockMonitoring.price > 124.99 * 1.05) reason = "PRICE_INCREASED";
          else if (mockMonitoring.delivery_days > 2) reason = "DELIVERY_DELAY";
          else if (mockMonitoring.rating < 4.0) reason = "NEGATIVE_REVIEW_IMPACT";

          const alertData = {
            user_id: user.uid,
            asin_code: item.asin_code,
            alert_type: "SALES_DROP",
            reason: reason,
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

          // Queue Email Alert
          const mailData = {
            to: user.email,
            message: {
              subject: `Amazon Alert – ASIN Issue Detected: ${item.asin_code}`,
              text: `ASIN: ${item.asin_code}\nIssue: ${reason.replace(/_/g, ' ')}\nSeverity: High\n\nPlease log in to your dashboard for detailed root cause analysis.`
            }
          };

          addDoc(mailRef, mailData).catch(async () => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: "mail",
              operation: "create",
              requestResourceData: mailData,
            }));
          });

          alertsCount++;
        }
      }

      toast({
        title: "Sync Complete",
        description: `Analyzed ${asins.length} products. Detected ${alertsCount} issues and queued email alerts.`,
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
          product_name: `Product ${cleanCode}`, 
          created_at: serverTimestamp(),
          status: "Monitoring"
        };
        return addDoc(collection(firestore, "asins"), docData);
      });
      await Promise.all(promises);
      toast({ title: "Success", description: `Added ${asinList.length} ASIN(s).` });
      setSingleAsin("");
      setBulkAsins("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to add ASINs." });
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
    const list = bulkAsins.split(/[\n,]+/).map(a => a.trim()).filter(a => a.length > 0);
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
        <div className="w-full md:w-1/3 space-y-6">
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <Plus className="h-4 w-4 text-accent" /> Add Single ASIN
              </CardTitle>
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
                <Upload className="h-4 w-4 text-accent" /> Bulk Import
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <Textarea 
                  placeholder="Paste ASINs here..." 
                  className="min-h-[120px] font-mono text-sm"
                  value={bulkAsins}
                  onChange={(e) => setBulkAsins(e.target.value)}
                  disabled={isAdding}
                />
                <Button type="submit" className="w-full" disabled={isAdding || !bulkAsins}>
                  Import ASINs
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="flex-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-headline">Monitored Catalog</CardTitle>
                <CardDescription>Currently tracking {asins?.length || 0} products</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={isSyncing || asins?.length === 0}>
                  {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Sync & Detect Issues
                </Button>
                <Input 
                  placeholder="Search..." 
                  className="w-32 md:w-48 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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
                    <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" /></TableCell></TableRow>
                  ) : filteredAsins?.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-accent/5" onClick={() => window.location.href = `/dashboard/asin/${item.asin_code}`}>
                      <TableCell className="font-mono text-xs font-bold text-accent">{item.asin_code}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.product_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.created_at?.toDate().toLocaleDateString() || "Just now"}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-accent/5 text-accent">{item.status || "Monitoring"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
