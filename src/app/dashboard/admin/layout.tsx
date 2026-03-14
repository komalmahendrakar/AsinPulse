
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { useMemoFirebase } from "@/firebase/use-memo-firebase";
import { Loader2, ShieldAlert } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  
  const { data: profile, loading: profileLoading } = useDoc(userDocRef);

  useEffect(() => {
    if (!userLoading && !profileLoading) {
      if (!user) {
        router.push("/login");
      } else if (profile?.role !== "admin") {
        router.push("/dashboard");
      }
    }
  }, [user, userLoading, profile, profileLoading, router]);

  if (userLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  if (!user || profile?.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-destructive" />
        <p className="text-sm font-bold text-destructive">Administrator Mode Enabled</p>
      </div>
      {children}
    </div>
  );
}
