
"use client";

import { useState } from "react";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, addDoc, query, where, orderBy, serverTimestamp, doc, updateDoc, getDocs, limit, startAfter } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, Loader2, RefreshCw, Zap, ShieldAlert } from "lucide-react";
import { useMemoFirebase } from "@/firebase/use-memo-firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const PLAN_LIMITS: Record<string, number> = {
  starter: 100,
  agency: 500,
  enterprise: 1000,
};

const BATCH_SIZE = 50;

export default function AsinsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [singleAsin, setSingleAsin] = useState("");
  const [bulkAsins, setBulkAsins] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const asinsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "asins"),
      where("user_id", "==", user.uid),
      orderBy("created_at", "desc")
    );
  }, [firestore, user?.uid]);

  const { data: asins, loading } = useCollection(asinsQuery);

  const currentPlan = profile?.subscription_plan || "starter";
  const currentLimit = PLAN_LIMITS[currentPlan] || 100;
  const currentCount = asins?.length || 0;

  const handleSyncAll = async () => {
    if (!firestore || !user?.uid || !user?.email) return;
    setIsSyncing(true);
    setSyncProgress({ current: 0, total: asins?.length || 0 });
    
    try {
      const monitoringRef = collection(firestore, "monitoring_data");
      const salesRef = collection(firestore, "sales_data");
      const alertsRef = collection(firestore, "alerts");
      const mailRef = collection(firestore, "mail");
      
      let lastVisible = null;
      let totalAlerts = 0;
      let totalProcessed = 0;

      // Batch Processing Loop
      while (true) {
        let q = query(
          collection(firestore, "asins"),
          where("user_id", "==", user.uid),
          orderBy("created_at", "desc"),
          limit(BATCH_SIZE)
        );

        if (lastVisible) {
          q = query(q, startAfter(lastVisible));
        }

        // Retry logic for fetching the batch
        const fetchBatchWithRetry = async (retries = 3) => {
          for (let i = 0; i < retries; i++) {
            try {
              return await getDocs(q);
            } catch (e) {
              if (i === retries - 1) throw e;
              await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
            }
          }
        };

        const snapshot = await fetchBatchWithRetry();
        if (!snapshot || snapshot.empty) break;

        lastVisible = snapshot.docs[snapshot.docs.length - 1];

        // Process items in current batch
        for (const docSnap of snapshot.docs) {
          const item = docSnap.data();
          
          // Simulation logic
          const isOutOfStock = Math.random() > 0.85;
          const buyBoxLost = Math.random() > 0.9;
          const priceHike = Math.random() > 0.92;
          const shippingDelay = Math.random() > 0.95;
          const badReview = Math.random() > 0.98;

          const basePrice = 124.99;
          const currentPrice = priceHike ? basePrice * 1.15 : basePrice;
          
          const mockMonitoring = {
            user_id: user.uid,
            asin_code: item.asin_code,
            timestamp: serverTimestamp(),
            price: Number(currentPrice.toFixed(2)),
            stock: isOutOfStock ? 0 : Math.floor(Math.random() * 50) + 1,
            buybox_owner: buyBoxLost ? "Competitor" : "Your Store",
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

          const dailyAverage = 50;
          const hasIssue = isOutOfStock || buyBoxLost || priceHike || shippingDelay || badReview;
          const todaySales = hasIssue 
            ? Math.floor(dailyAverage * (0.1 + Math.random() * 0.3)) 
            : Math.floor(dailyAverage * (0.8 + Math.random() * 0.4));

          const todaySalesData = {
            user_id: user.uid,
            asin_code: item.asin_code,
            date: new Date().toISOString().split('T')[0],
            units_sold: todaySales,
            revenue: Number((todaySales * currentPrice).toFixed(2))
          };

          addDoc(salesRef, todaySalesData).catch(async () => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: "sales_data",
              operation: "create",
              requestResourceData: todaySalesData,
            }));
          });

          if (todaySales < (dailyAverage * 0.7)) {
            let reason = "SALES_VELOCITY_DROP";
            if (mockMonitoring.stock === 0) reason = "OUT_OF_STOCK";
            else if (mockMonitoring.buybox_owner !== "Your Store") reason = "BUYBOX_LOST";
            else if (mockMonitoring.price > basePrice * 1.05) reason = "PRICE_INCREASED";
            else if (mockMonitoring.delivery_days > 2) reason = "DELIVERY_DELAY";
            else if (mockMonitoring.rating < 4.0) reason = "NEGATIVE_REVIEW_IMPACT";

            const alertData = {
              user_id: user.uid,
              asin_code: item.asin_code,
              alert_type: "SALES_DROP",
              reason: reason,
              severity: "high",
              status: "active",
              timestamp: serverTimestamp(),
            };

            addDoc(alertsRef, alertData);
            totalAlerts++;
          }
          
          totalProcessed++;
          setSyncProgress(prev => ({ ...prev, current: totalProcessed }));
        }

        if (snapshot.docs.length < BATCH_SIZE) break;
        
        // Artificial throttle between batches to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      }

      updateDoc(doc(firestore, "users", user.uid), {
        last_sync_at: serverTimestamp()
      });

      toast({
        title: "Batch Processing Complete",
        description: `Successfully audited ${totalProcessed} ASINs. Detected ${totalAlerts} issues.`,
      });
    } catch (error) {
      console.error("Batch sync failed", error);
      toast({ variant: "destructive", title: "Sync Error", description: "Failed to complete batch monitoring run." });
    } finally {
      setIsSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
    }
  };

  const handleAddAsins = async (asinList: string[]) => {
    if (!firestore || !user?.uid || asinList.length === 0) return;
    
    if (currentCount + asinList.length > currentLimit) {
      toast({ variant: "destructive", title: "Limit Exceeded", description: "ASIN limit reached for your subscription plan." });
      return;
    }

    setIsAdding(true);
    try {
      const promises = asinList.map(async (code) => {
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) return;
        const docData = {
          user_id: user.uid,
          asin_code: cleanCode,
          product_name: `Catalog Item ${cleanCode}`, 
          created_at: serverTimestamp(),
          status: "Monitoring"
        };
        return addDoc(collection(firestore, "asins"), docData);
      });
      await Promise.all(promises);
      toast({ title: "Success", description: `Enrolled ${asinList.length} ASIN(s) into monitoring job.` });
      setSingleAsin("");
      setBulkAsins("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Enrollment failed." });
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
          <Card className="border-accent/20 bg-accent/5 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-accent">Quota Usage</CardTitle>
                <Badge variant="outline" className="capitalize border-accent/30 text-accent">{currentPlan}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold">{currentCount} / {currentLimit}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">ASINs Tracked</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${currentCount >= currentLimit ? 'bg-destructive' : 'bg-accent'}`}
                  style={{ width: `${Math.min((currentCount / currentLimit) * 100, 100)}%` }}
                />
              </div>
              {currentCount >= currentLimit && (
                <p className="text-[10px] text-destructive mt-2 flex items-center gap-1 font-bold">
                  <ShieldAlert className="h-3 w-3" /> Upgrade to Agency plan for more slots.
                </p>
              )}
            </CardContent>
          </Card>

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
                  className="bg-background/50"
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
                  placeholder="Paste ASINs separated by new lines or commas..." 
                  className="min-h-[120px] font-mono text-sm bg-background/50"
                  value={bulkAsins}
                  onChange={(e) => setBulkAsins(e.target.value)}
                  disabled={isAdding}
                />
                <Button type="submit" className="w-full" disabled={isAdding || !bulkAsins}>
                  Enroll ASINs
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="flex-1">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-headline">Monitored Catalog</CardTitle>
                <CardDescription>Job status for {asins?.length || 0} enrolled products</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  className="h-9 border-accent/30 text-accent font-bold bg-accent/5 hover:bg-accent/10" 
                  onClick={handleSyncAll} 
                  disabled={isSyncing || asins?.length === 0}
                >
                  {isSyncing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-[10px]">Processing {syncProgress.current}/{syncProgress.total}</span>
                    </div>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Trigger Scheduler Run
                    </>
                  )}
                </Button>
                <Input 
                  placeholder="Search catalog..." 
                  className="w-32 md:w-48 h-9 bg-background/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="font-bold">ASIN</TableHead>
                    <TableHead className="font-bold">Label</TableHead>
                    <TableHead className="font-bold">Enrolled On</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" /></TableCell></TableRow>
                  ) : filteredAsins?.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer group hover:bg-accent/5" onClick={() => window.location.href = `/dashboard/asin/${item.asin_code}`}>
                      <TableCell className="font-mono text-xs font-bold text-accent">{item.asin_code}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">{item.product_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.created_at?.toDate().toLocaleDateString() || "Just now"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-500/5 text-green-500 border-green-500/20 px-3">
                          <RefreshCw className="h-3 w-3 mr-1.5 animate-spin duration-[3000ms]" /> {item.status || "Monitoring"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && (!filteredAsins || filteredAsins.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">
                        No ASINs enrolled in monitoring. Add your first product to start tracking.
                      </TableCell>
                    </TableRow>
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
