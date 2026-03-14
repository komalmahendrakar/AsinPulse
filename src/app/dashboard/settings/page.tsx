"use client";

import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Calendar, ShieldCheck, Save, Loader2, RefreshCw } from "lucide-react";
import { useMemoFirebase } from "@/firebase/use-memo-firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);

  const { data: profile, loading } = useDoc(userDocRef);

  const handleUpdateSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user?.uid) return;

    const formData = new FormData(e.currentTarget);
    const updates = {
      monitoring_frequency: formData.get("monitoring_frequency"),
      sales_check_time: formData.get("sales_check_time"),
    };

    const userRef = doc(firestore, "users", user.uid);

    // Non-blocking mutation with centralized error handling
    updateDoc(userRef, updates)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: updates,
        }));
      });

    toast({ title: "Update Initiated", description: "Cloud Scheduler settings are being synchronized." });
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-accent" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Scheduler Configuration</h1>
          <p className="text-muted-foreground mt-1">Manage background monitoring and detection jobs</p>
        </div>
        <div className="p-3 bg-accent/10 border border-accent/20 rounded-xl">
          <ShieldCheck className="h-6 w-6 text-accent" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" /> ASIN Monitor Job
            </CardTitle>
            <CardDescription>Frequency of operational signal collection</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateSettings} className="space-y-6">
              <div className="space-y-2">
                <Label>Scan Frequency</Label>
                <Select name="monitoring_frequency" defaultValue={profile?.monitoring_frequency || "hourly"}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15m">Every 15 Minutes</SelectItem>
                    <SelectItem value="30m">Every 30 Minutes</SelectItem>
                    <SelectItem value="hourly">Every 60 Minutes (Default)</SelectItem>
                    <SelectItem value="daily">Every 24 Hours</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">High-frequency scans may consume more quota.</p>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <Button type="submit" className="gap-2">
                  <Save className="h-4 w-4" /> Save Schedule
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" /> Sales Detection Job
            </CardTitle>
            <CardDescription>Daily performance audit and anomaly check</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateSettings} className="space-y-6">
              <div className="space-y-2">
                <Label>Daily Audit Time (UTC)</Label>
                <Input 
                  name="sales_check_time" 
                  type="time" 
                  defaultValue={profile?.sales_check_time || "00:00"}
                  className="bg-background/50" 
                />
                <p className="text-[10px] text-muted-foreground">Runs a full root cause analysis on the previous day's sales velocity.</p>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <Button type="submit" className="gap-2">
                  <Save className="h-4 w-4" /> Save Schedule
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/30 border-dashed border-2">
        <CardContent className="py-12 flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-full bg-background border shadow-inner">
            <RefreshCw className="h-10 w-10 text-muted-foreground animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-headline">Simulate Scheduler Run</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              In production, these jobs run automatically in the background. In this prototype, you can trigger the full audit manually from the Monitored ASINs page.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.href='/dashboard/asins'} className="rounded-xl px-8 h-12 border-accent/20 text-accent font-bold">
            Go to Manual Sync
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}