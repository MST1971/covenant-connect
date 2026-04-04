import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Shield, Search, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Constants } from "@/integrations/supabase/types";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  pastor: "Pastor",
  secretary: "Secretary",
  department_leader: "Dept. Leader",
  finance_officer: "Finance Officer",
  member: "Member",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-destructive/10 text-destructive border-destructive/20",
  pastor: "bg-primary/10 text-primary border-primary/20",
  secretary: "bg-secondary/10 text-secondary border-secondary/20",
  department_leader: "bg-accent/10 text-accent-foreground border-accent/20",
  finance_officer: "bg-primary/10 text-primary border-primary/20",
  member: "bg-muted text-muted-foreground border-muted",
};

const RoleManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { isSuperAdmin } = useUserRole();
  const [search, setSearch] = useState("");

  const { data: usersWithRoles, isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("id, full_name, email, photo_url, user_id")
        .not("user_id", "is", null)
        .order("full_name");
      if (pError) throw pError;

      const { data: roles, error: rError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rError) throw rError;

      const roleMap = new Map<string, string[]>();
      roles?.forEach((r) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      return (profiles || []).map((p) => ({
        ...p,
        roles: roleMap.get(p.user_id!) || ["member"],
      }));
    },
    enabled: isSuperAdmin,
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      // Delete existing roles
      const { error: delError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (delError) throw delError;

      // Insert new role
      const { error: insError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole as any });
      if (insError) throw insError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({ title: "Role updated successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = usersWithRoles?.filter((u) =>
    !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="border-0 shadow-sm max-w-md">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-destructive/40 mb-3" />
            <p className="font-semibold">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-1">Only Super Admins can manage roles.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 lg:px-8 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              Role Management
            </h1>
            <p className="text-xs text-muted-foreground">Assign and manage user roles</p>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-8 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-0 shadow-sm animate-pulse"><CardContent className="p-5 h-16" /></Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((user) => (
              <Card key={user.id} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`hidden sm:inline-flex ${ROLE_COLORS[user.roles[0]] || ""}`}>
                      {ROLE_LABELS[user.roles[0]] || user.roles[0]}
                    </Badge>
                    <Select
                      value={user.roles[0]}
                      onValueChange={(val) => updateRole.mutate({ userId: user.user_id!, newRole: val })}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Constants.public.Enums.app_role.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role] || role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleManagement;
