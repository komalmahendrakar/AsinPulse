
"use client";

import { useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMemoFirebase } from "@/firebase/use-memo-firebase";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, UserX, UserCheck, Mail, Calendar } from "lucide-react";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function AdminUsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"), orderBy("created_at", "desc"));
  }, [firestore]);

  const { data: users, loading } = useCollection(usersQuery);

  const toggleUserStatus = (userId: string, currentStatus: string) => {
    if (!firestore) return;
    const userRef = doc(firestore, "users", userId);
    const newStatus = currentStatus === "suspended" ? "active" : "suspended";
    const updateData = { status: newStatus };

    updateDoc(userRef, updateData)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: updateData,
        }));
      });

    toast({
      title: `User ${newStatus === 'active' ? 'Restored' : 'Suspended'}`,
      description: `Account status for user ${userId} has been updated.`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline">User Directory</h1>
          <p className="text-sm text-muted-foreground">Manage platform users and access controls.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{u.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {u.created_at?.toDate().toLocaleDateString() || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{u.subscription_plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                      {u.role || "user"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === 'suspended' ? 'destructive' : 'outline'} className="capitalize">
                      {u.status || "active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {u.role !== 'admin' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleUserStatus(u.id, u.status)}
                        className={u.status === 'suspended' ? 'text-green-500' : 'text-destructive'}
                      >
                        {u.status === 'suspended' ? (
                          <><UserCheck className="h-4 w-4 mr-2" /> Restore</>
                        ) : (
                          <><UserX className="h-4 w-4 mr-2" /> Suspend</>
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
