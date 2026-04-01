import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Edit2, Trash2, Users, UserPlus, X, Loader2 } from "lucide-react";
import churchLogo from "@/assets/church-logo.png";

const Departments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", leader_id: "" });
  const [addMemberId, setAddMemberId] = useState("");

  const { data: departments, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*, department_members(id, profile_id, profiles(id, full_name, photo_url))").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: allMembers } = useQuery({
    queryKey: ["all-profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { name: form.name, description: form.description || null };
      if (form.leader_id) payload.leader_id = form.leader_id;
      if (editingId) {
        const { error } = await supabase.from("departments").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("departments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: editingId ? "Department updated" : "Department created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); toast({ title: "Department deleted" }); },
  });

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("department_members").insert({ department_id: selectedDept.id, profile_id: addMemberId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); setAddMemberId(""); toast({ title: "Member added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("department_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); toast({ title: "Member removed" }); },
  });

  const resetForm = () => { setForm({ name: "", description: "", leader_id: "" }); setEditingId(null); };

  const openEdit = (d: any) => {
    setEditingId(d.id);
    setForm({ name: d.name, description: d.description || "", leader_id: d.leader_id || "" });
    setDialogOpen(true);
  };

  const openMembers = (d: any) => {
    setSelectedDept(d);
    setMembersDialogOpen(true);
  };

  // Refresh selectedDept data when departments change
  const currentDeptData = departments?.find(d => d.id === selectedDept?.id) || selectedDept;
  const existingMemberIds = currentDeptData?.department_members?.map((dm: any) => dm.profile_id) || [];
  const availableMembers = allMembers?.filter(m => !existingMemberIds.includes(m.id)) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 lg:px-8 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-5 w-5" /></Button>
        <img src={churchLogo} alt="CBC" className="h-8 w-8 rounded-full" />
        <div className="flex-1">
          <h1 className="text-lg font-bold">Departments</h1>
          <p className="text-xs text-muted-foreground">Manage ministries & teams</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-accent-foreground font-semibold shadow-gold"><Plus className="h-4 w-4 mr-1" /> Add Department</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit Department" : "New Department"}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Department Name *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Choir" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Leader</Label>
                <Select value={form.leader_id} onValueChange={(v) => setForm(f => ({ ...f, leader_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select leader" /></SelectTrigger>
                  <SelectContent>{allMembers?.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button className="w-full gradient-gold text-accent-foreground font-semibold" onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {editingId ? "Update" : "Create"} Department
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="max-w-4xl mx-auto p-4 lg:p-8">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : !departments?.length ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No departments yet. Create your first department.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {departments.map((d) => (
              <Card key={d.id} className="border-0 shadow-sm hover:shadow-church transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{d.name}</h3>
                      {d.description && <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>}
                    </div>
                    <Badge variant="secondary" className="text-xs">{d.department_members?.length || 0} members</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openMembers(d)}>
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Members
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Members Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{currentDeptData?.name} — Members</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Select value={addMemberId} onValueChange={setAddMemberId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select member to add" /></SelectTrigger>
                <SelectContent>{availableMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="icon" onClick={() => addMemberMutation.mutate()} disabled={!addMemberId || addMemberMutation.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {currentDeptData?.department_members?.map((dm: any) => (
                <div key={dm.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                  <span className="text-sm">{dm.profiles?.full_name || "Unknown"}</span>
                  <button onClick={() => removeMemberMutation.mutate(dm.id)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                </div>
              ))}
              {!currentDeptData?.department_members?.length && <p className="text-center text-sm text-muted-foreground py-4">No members yet</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Departments;
