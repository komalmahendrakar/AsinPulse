
"use client";

import { useState } from "react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, addDoc, query, where, orderBy, serverTimestamp, Firestore } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, Loader2, Package, Search, Trash2 } from "lucide-react";
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

  const handleAddAsins = async (asinList: string[]) => {
    if (!firestore || !user?.uid || asinList.length === 0) return;
    
    setIsAdding(true);
    const addedCount = 0;
    
    try {
      const promises = asinList.map(async (code) => {
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) return;

        const docData = {
          user_id: user.uid,
          asin_code: cleanCode,
          product_name: "Pending Retrieval...", // Will be updated by monitoring engine
          created_at: serverTimestamp(),
          status: "Pending Sync"
        };

        return addDoc(collection(firestore, "asins"), docData)
          .catch(async (err) => {
             const permissionError = new FirestorePermissionError({
               path: "asins",
               operation: "create",
               requestResourceData: docData,
             });
             errorEmitter.emit('permission-error', permissionError);
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
        description: "Failed to add some ASINs. Please try again.",
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
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search catalog..." 
                  className="pl-9 w-48 md:w-64 h-9"
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
                      <TableRow key={item.id} className="group">
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
