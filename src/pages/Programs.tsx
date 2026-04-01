import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Edit2, Trash2, Clock, Calendar, Loader2 } from "lucide-react";
import churchLogo from "@/assets/church-logo.png";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const Programs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", day: "Sunday", start_time: "09:00", end_time: "11:00", grace_period: "15" });

  const { data: programs, isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*").order("day").order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        day: form.day,
        start_time: form.start_time,
        end_time: form.end_time,
        grace_period: `${form.grace_period} minutes`,
      };
      if (editingId) {
        const { error } = await supabase.from("programs").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("programs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: editingId ? "Program updated" : "Program created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast({ title: "Program deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("programs").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["programs"] }),
  });

  const resetForm = () => {
    setForm({ name: "", day: "Sunday", start_time: "09:00", end_time: "11:00", grace_period: "15" });
    setEditingId(null);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    const graceMins = p.grace_period ? parseInt(p.grace_period.replace(/[^\d]/g, "")) || 15 : 15;
    setForm({ name: p.name, day: p.day, start_time: p.start_time?.slice(0, 5), end_time: p.end_time?.slice(0, 5), grace_period: String(graceMins) });
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 lg:px-8 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <img src={churchLogo} alt="CBC" className="h-8 w-8 rounded-full" />
        <div className="flex-1">
          <h1 className="text-lg font-bold">Church Programs</h1>
          <p className="text-xs text-muted-foreground">Manage services & activities</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-gold text-accent-foreground font-semibold shadow-gold">
              <Plus className="h-4 w-4 mr-1" /> Add Program
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Program" : "New Program"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Program Name *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sunday Worship" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Day</Label>
                  <Select value={form.day} onValueChange={(v) => setForm(f => ({ ...f, day: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Grace Period (mins)</Label>
                  <Input type="number" value={form.grace_period} onChange={(e) => setForm(f => ({ ...f, grace_period: e.target.value }))} min={0} max={60} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Start Time</Label>
                  <Input type="time" value={form.start_time} onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Time</Label>
                  <Input type="time" value={form.end_time} onChange={(e) => setForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full gradient-gold text-accent-foreground font-semibold" onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editingId ? "Update" : "Create"} Program
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="max-w-4xl mx-auto p-4 lg:p-8">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : !programs?.length ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No programs yet. Create your first church program.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {programs.map((p) => (
              <Card key={p.id} className={`border-0 shadow-sm transition-opacity ${!p.is_active ? "opacity-50" : ""}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{p.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{p.day}</span>
                      <Clock className="h-3 w-3" />
                      <span>{p.start_time?.slice(0, 5)} - {p.end_time?.slice(0, 5)}</span>
                    </p>
                  </div>
                  <Switch checked={p.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: p.id, is_active: v })} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Programs;
