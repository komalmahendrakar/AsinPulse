"use client";

import { useState } from "react";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, addDoc, query, where, orderBy, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, RefreshCw, Zap, Package } from "lucide-react";
import { useMemoFirebase } from "@/firebase/use-memo-firebase";
import { executeSecureSyncBatch } from "@/app/actions/sync-asins";
import { fetchAmazonProduct } from "@/lib/rainforest";

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
    if (!firestore || !user?.uid || !user?.email || !asins) return;
    setIsSyncing(true);
    setSyncProgress({ current: 0, total: asins.length });
    
    let totalAlerts = 0;
    let totalProcessed = 0;

    try {
      for (let i = 0; i < asins.length; i += BATCH_SIZE) {
        const batch = asins.slice(i, i + BATCH_SIZE);
        const results = await executeSecureSyncBatch(user.uid, user.email, batch);
        
        totalProcessed += results.processed;
        totalAlerts += results.alerts;
        setSyncProgress(prev => ({ ...prev, current: totalProcessed }));
      }

      await updateDoc(doc(firestore, "users", user.uid), {
        last_sync_at: serverTimestamp()
      });

      toast({
        title: "Monitoring Complete",
        description: `Audited ${totalProcessed} ASINs securely. Detected ${totalAlerts} issues.`,
      });
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Sync Failure", 
        description: error.message || "Failed to execute secure sync." 
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
    }
  };

  const handleAddAsins = async (asinList: string[]) => {
    if (!firestore || !user?.uid || asinList.length === 0) return;
    
    if (currentCount + asinList.length > currentLimit) {
      toast({ 
        variant: "destructive", 
        title: "Limit Exceeded", 
        description: "ASIN limit reached for your subscription plan." 
      });
      return;
    }

    setIsAdding(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const code of asinList) {
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) continue;

        // 1. Validate ASIN with Rainforest API
        try {
          const product = await fetchAmazonProduct(cleanCode);
          
          if (!product) {
            toast({
              variant: "destructive",
              title: "Validation Failed",
              description: `ASIN ${cleanCode}: Invalid ASIN or product not found on Amazon.`,
            });
            failCount++;
            continue;
          }

          // 2. Add to Firestore with real data
          await addDoc(collection(firestore, "asins"), {
            user_id: user.uid,
            asin_code: cleanCode,
            product_name: product.title,
            price: product.price,
            rating: product.rating,
            reviews: product.reviews,
            stock: product.stock.toLowerCase().includes('in stock') ? 99 : 0,
            availability_raw: product.stock,
            created_at: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            status: "Monitoring"
          });
          
          successCount++;
        } catch (err: any) {
          console.error(`Validation error for ${cleanCode}:`, err.message);
          toast({
            variant: "destructive",
            title: "Error",
            description: `Failed to validate ASIN ${cleanCode}.`,
          });
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({ 
          title: "Enrollment Successful", 
          description: `Successfully enrolled ${successCount} ASIN(s) into monitoring.` 
        });
      }
      
      setSingleAsin("");
      setBulkAsins("");
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "System Error", 
        description: "Enrollment pipeline failed." 
      });
    } finally {
      setIsAdding(false);
    }
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
            </CardContent>
          </Card>

          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <Plus className="h-4 w-4 text-accent" /> Add ASIN
              </CardTitle>
              <CardDescription className="text-xs">ASINs are validated via Amazon before entry.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={(e) => { e.preventDefault(); handleAddAsins([singleAsin]); }} className="flex gap-2">
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
              <Textarea 
                placeholder="Bulk ASINs (newline separated)..." 
                value={bulkAsins}
                onChange={(e) => setBulkAsins(e.target.value)}
                className="bg-background/50 h-24"
                disabled={isAdding}
              />
              <Button 
                onClick={() => handleAddAsins(bulkAsins.split(/[\n,]+/).filter(a => a.trim()))} 
                className="w-full" 
                variant="outline" 
                disabled={isAdding || !bulkAsins}
              >
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Bulk Enroll
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="flex-1">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-headline">Monitored Catalog</CardTitle>
                <CardDescription>Job status for {asins?.length || 0} products</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  className="h-9 bg-accent text-accent-foreground hover:bg-accent/90" 
                  onClick={handleSyncAll} 
                  disabled={isSyncing || asins?.length === 0}
                >
                  {isSyncing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{syncProgress.current}/{syncProgress.total}</span>
                    </div>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Trigger Secure Sync
                    </>
                  )}
                </Button>
                <Input 
                  placeholder="Search catalog..." 
                  className="w-32 md:w-48 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead>ASIN</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" /></TableCell></TableRow>
                  ) : filteredAsins?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">
                        No ASINs found in your catalog.
                      </TableCell>
                    </TableRow>
                  ) : filteredAsins?.map((item) => (
                    <TableRow 
                      key={item.id} 
                      className="cursor-pointer hover:bg-accent/5" 
                      onClick={() => window.location.href = `/dashboard/asin/${item.asin_code}`}
                    >
                      <TableCell className="font-mono text-xs font-bold text-accent">{item.asin_code}</TableCell>
                      <TableCell className="font-medium max-w-[300px] truncate">{item.product_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-500/5 text-green-500 border-green-500/20">
                          <RefreshCw className="h-3 w-3 mr-1.5 animate-spin duration-[3000ms]" /> Monitoring
                        </Badge>
                      </TableCell>
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
