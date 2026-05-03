import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Search, DollarSign, Calendar, Users, Download, Receipt
} from "lucide-react";
import GivingReceipt from "@/components/GivingReceipt";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const givingTypes = ["tithe", "offering", "donation", "seed", "building_fund", "mission", "other"];
const paymentMethods = ["cash", "transfer", "pos", "online"];

const GivingManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [receiptRecord, setReceiptRecord] = useState<any>(null);
  const [form, setForm] = useState({
    profile_id: "", amount: "", giving_type: "tithe",
    payment_method: "cash", date: new Date().toISOString().split("T")[0],
    reference: "", notes: "",
  });

  const update = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));

  const { data: settings } = useQuery({
    queryKey: ["app_settings", "giving_receipts"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "giving_receipts").maybeSingle();
      return (data?.value as any) || { enabled: true, types: {}, footer_note: "" };
    },
  });

  const receiptEnabled = (type: string) => settings?.enabled && (settings?.types?.[type] !== false);

  const { data: profiles } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, member_code").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["giving-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("giving_records")
        .select("*, profiles(full_name, member_code)")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addRecord = useMutation({
    mutationFn: async () => {
      if (!form.profile_id) throw new Error("Select a member");
      if (!form.amount || Number(form.amount) <= 0) throw new Error("Enter a valid amount");
      const { data, error } = await supabase.from("giving_records").insert({
        profile_id: form.profile_id,
        amount: Number(form.amount),
        giving_type: form.giving_type,
        payment_method: form.payment_method,
        date: form.date,
        reference: form.reference.trim() || null,
        notes: form.notes.trim() || null,
        recorded_by: user?.id || null,
      }).select("*, profiles(full_name, member_code)").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (rec: any) => {
      qc.invalidateQueries({ queryKey: ["giving-records"] });
      setShowForm(false);
      setForm({ profile_id: "", amount: "", giving_type: "tithe", payment_method: "cash", date: new Date().toISOString().split("T")[0], reference: "", notes: "" });
      toast({ title: "Giving recorded!" });
      if (rec && receiptEnabled(rec.giving_type)) setReceiptRecord(rec);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = records?.filter((r: any) => {
    const matchSearch = !search || r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) || r.reference?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || r.giving_type === typeFilter;
    return matchSearch && matchType;
  }) || [];

  const totalAmount = filtered.reduce((sum: number, r: any) => sum + Number(r.amount), 0);

  const [memberSearch, setMemberSearch] = useState("");
  const filteredMembers = profiles?.filter(p =>
    !memberSearch || p.full_name.toLowerCase().includes(memberSearch.toLowerCase()) || p.member_code?.toLowerCase().includes(memberSearch.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Giving Management</h1>
              <p className="text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""} • Total: ₦{totalAmount.toLocaleString()}</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)} className="gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90 gap-1.5" size="sm">
            <Plus className="h-4 w-4" /> Record Giving
          </Button>
        </div>
      </header>

      <div className="p-4 lg:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by member name or reference..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {givingTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["tithe", "offering", "donation", "seed"].map(type => {
            const sum = (records || []).filter((r: any) => r.giving_type === type).reduce((s: number, r: any) => s + Number(r.amount), 0);
            return (
              <Card key={type} className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground capitalize">{type}</p>
                  <p className="text-lg font-bold mt-1" style={{ fontFamily: "var(--font-display)" }}>₦{sum.toLocaleString()}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Card key={i} className="border-0 shadow-sm animate-pulse"><CardContent className="p-4 h-16" /></Card>)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="py-16 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No giving records found</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((r: any) => (
              <Card key={r.id} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                      <DollarSign className="h-5 w-5 text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{r.profiles?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground capitalize truncate">
                        {r.giving_type.replace("_", " ")} • {r.payment_method} • {new Date(r.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">₦{Number(r.amount).toLocaleString()}</p>
                    {r.reference && <p className="text-[10px] text-muted-foreground">{r.reference}</p>}
                  </div>
                  {receiptEnabled(r.giving_type) && (
                    <Button size="icon" variant="ghost" onClick={() => setReceiptRecord(r)} title="Print receipt">
                      <Receipt className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Record Giving Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Giving</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Member *</Label>
              <Input placeholder="Search member..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
              {memberSearch && (
                <div className="max-h-32 overflow-y-auto border rounded-md">
                  {filteredMembers.slice(0, 10).map(p => (
                    <button key={p.id} onClick={() => { update("profile_id", p.id); setMemberSearch(p.full_name); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${form.profile_id === p.id ? "bg-primary/10" : ""}`}>
                      {p.full_name} {p.member_code && <span className="text-muted-foreground text-xs ml-1">({p.member_code})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount (₦) *</Label>
                <Input type="number" min="0" step="100" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.giving_type} onValueChange={(v) => update("giving_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {givingTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={(v) => update("payment_method", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input value={form.reference} onChange={(e) => update("reference", e.target.value)} placeholder="Transaction ref (optional)" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Optional notes" rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => addRecord.mutate()} disabled={addRecord.isPending} className="gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90">
                {addRecord.isPending ? "Saving..." : "Record Giving"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {receiptRecord && (
        <GivingReceipt
          record={receiptRecord}
          footerNote={settings?.footer_note}
          onClose={() => setReceiptRecord(null)}
        />
      )}
    </div>
  );
};

export default GivingManagement;
