import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, UserPlus, Search, Phone, Mail, Calendar,
  ChevronRight, Users, Check, Clock, MessageSquare, X, FileDown, Download
} from "lucide-react";
import { exportToCSV, exportToPDF } from "@/utils/exportUtils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const statusColors: Record<string, string> = {
  pending: "bg-accent/10 text-accent-foreground border-accent/20",
  contacted: "bg-primary/10 text-primary border-primary/20",
  followed_up: "bg-secondary/10 text-secondary border-secondary/20",
  converted: "bg-green-100 text-green-700 border-green-200",
  inactive: "bg-muted text-muted-foreground border-muted",
};

const Visitors = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null);
  const [form, setForm] = useState({
    full_name: "", phone_number: "", email: "", address: "",
    gender: "", age_range: "", visit_date: new Date().toISOString().split("T")[0],
    invited_by_name: "", program_attended: "", follow_up_notes: "",
  });

  const update = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));

  const { data: visitors, isLoading } = useQuery({
    queryKey: ["visitors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("visitors").select("*").order("visit_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addVisitor = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("visitors").insert({
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        gender: form.gender || null,
        age_range: form.age_range || null,
        visit_date: form.visit_date,
        invited_by_name: form.invited_by_name.trim() || null,
        program_attended: form.program_attended.trim() || null,
        follow_up_notes: form.follow_up_notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visitors"] });
      setShowForm(false);
      setForm({ full_name: "", phone_number: "", email: "", address: "", gender: "", age_range: "", visit_date: new Date().toISOString().split("T")[0], invited_by_name: "", program_attended: "", follow_up_notes: "" });
      toast({ title: "Visitor registered!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateFollowUp = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updateData: any = { follow_up_status: status, follow_up_date: new Date().toISOString().split("T")[0] };
      if (notes) updateData.follow_up_notes = notes;
      const { error } = await supabase.from("visitors").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visitors"] });
      toast({ title: "Follow-up updated!" });
    },
  });

  const convertToMember = useMutation({
    mutationFn: async (visitor: any) => {
      // Create a profile from visitor data
      const { data: profile, error: pErr } = await supabase.from("profiles").insert({
        full_name: visitor.full_name,
        phone_number: visitor.phone_number,
        email: visitor.email,
        address: visitor.address,
        gender: visitor.gender === "male" || visitor.gender === "female" ? visitor.gender : null,
        membership_status: "member",
      }).select("id").single();
      if (pErr) throw pErr;

      // Mark visitor as converted
      const { error } = await supabase.from("visitors").update({
        converted_to_member: true,
        converted_profile_id: profile.id,
        follow_up_status: "converted",
      }).eq("id", visitor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visitors"] });
      setSelectedVisitor(null);
      toast({ title: "Visitor converted to member!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = visitors?.filter((v: any) => {
    const matchSearch = !search || v.full_name.toLowerCase().includes(search.toLowerCase()) || v.phone_number?.includes(search) || v.invited_by_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.follow_up_status === statusFilter;
    return matchSearch && matchStatus;
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Visitors</h1>
              <p className="text-xs text-muted-foreground">{filtered.length} visitor{filtered.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowForm(true)} className="gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90 gap-1.5" size="sm">
              <UserPlus className="h-4 w-4" /> Register Visitor
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const cols = [
                { key: "full_name", label: "Name" }, { key: "phone_number", label: "Phone" },
                { key: "email", label: "Email" }, { key: "visit_date", label: "Visit Date" },
                { key: "invited_by_name", label: "Invited By" }, { key: "follow_up_status", label: "Status" },
              ];
              exportToCSV(filtered, "visitors-list", cols);
            }}><FileDown className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => {
              const cols = [
                { key: "full_name", label: "Name" }, { key: "phone_number", label: "Phone" },
                { key: "visit_date", label: "Visit Date" }, { key: "invited_by_name", label: "Invited By" },
                { key: "follow_up_status", label: "Status" },
              ];
              exportToPDF(filtered, "Visitors List — Covenant Baptist Church Suleja", cols);
            }}><Download className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, phone, or inviter..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="followed_up">Followed Up</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Card key={i} className="border-0 shadow-sm animate-pulse"><CardContent className="p-5 h-28" /></Card>)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="py-16 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No visitors found</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((v: any) => (
              <Card key={v.id} className="border-0 shadow-sm hover:shadow-church transition-all cursor-pointer" onClick={() => setSelectedVisitor(v)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{v.full_name}</h3>
                      <Badge variant="outline" className={`text-[10px] mt-1 ${statusColors[v.follow_up_status] || ""}`}>{v.follow_up_status}</Badge>
                      <div className="mt-2 space-y-0.5">
                        {v.phone_number && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="h-3 w-3" />{v.phone_number}</p>}
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3 w-3" />{new Date(v.visit_date).toLocaleDateString()}</p>
                        {v.invited_by_name && <p className="text-xs text-muted-foreground">Invited by: {v.invited_by_name}</p>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Register Visitor Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Register New Visitor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Visitor's name" maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input type="tel" value={form.phone_number} onChange={(e) => update("phone_number", e.target.value)} placeholder="+234..." maxLength={20} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} maxLength={255} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Age Range</Label>
                <Select value={form.age_range} onValueChange={(v) => update("age_range", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Under 18","18-25","26-35","36-45","46-55","56-65","65+"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Visit Date</Label>
                <Input type="date" value={form.visit_date} onChange={(e) => update("visit_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Invited By (Name)</Label>
                <Input value={form.invited_by_name} onChange={(e) => update("invited_by_name", e.target.value)} placeholder="Who invited them?" maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label>Program Attended</Label>
                <Input value={form.program_attended} onChange={(e) => update("program_attended", e.target.value)} placeholder="e.g. Sunday Service" maxLength={100} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => update("address", e.target.value)} maxLength={255} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={form.follow_up_notes} onChange={(e) => update("follow_up_notes", e.target.value)} placeholder="Any notes about the visitor" maxLength={500} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => addVisitor.mutate()} disabled={addVisitor.isPending} className="gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90">
                {addVisitor.isPending ? "Saving..." : "Register Visitor"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Visitor Detail Dialog */}
      <Dialog open={!!selectedVisitor} onOpenChange={(o) => !o && setSelectedVisitor(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedVisitor && (
            <>
              <DialogHeader>
                <DialogTitle style={{ fontFamily: "var(--font-display)" }}>{selectedVisitor.full_name}</DialogTitle>
                <Badge variant="outline" className={`w-fit mt-1 ${statusColors[selectedVisitor.follow_up_status] || ""}`}>{selectedVisitor.follow_up_status}</Badge>
              </DialogHeader>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Phone" value={selectedVisitor.phone_number} />
                <InfoRow label="Email" value={selectedVisitor.email} />
                <InfoRow label="Gender" value={selectedVisitor.gender} />
                <InfoRow label="Age Range" value={selectedVisitor.age_range} />
                <InfoRow label="Visit Date" value={selectedVisitor.visit_date} />
                <InfoRow label="Program" value={selectedVisitor.program_attended} />
                <InfoRow label="Invited By" value={selectedVisitor.invited_by_name} />
                <InfoRow label="Address" value={selectedVisitor.address} />
              </div>
              {selectedVisitor.follow_up_notes && (
                <div className="text-sm"><span className="text-muted-foreground">Notes:</span><p className="mt-0.5">{selectedVisitor.follow_up_notes}</p></div>
              )}
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Actions</p>
                <div className="flex flex-wrap gap-2">
                  {selectedVisitor.follow_up_status !== "contacted" && (
                    <Button size="sm" variant="outline" onClick={() => updateFollowUp.mutate({ id: selectedVisitor.id, status: "contacted" })}>
                      <Phone className="h-3.5 w-3.5 mr-1" /> Mark Contacted
                    </Button>
                  )}
                  {selectedVisitor.follow_up_status !== "followed_up" && (
                    <Button size="sm" variant="outline" onClick={() => updateFollowUp.mutate({ id: selectedVisitor.id, status: "followed_up" })}>
                      <MessageSquare className="h-3.5 w-3.5 mr-1" /> Mark Followed Up
                    </Button>
                  )}
                  {!selectedVisitor.converted_to_member && (
                    <Button size="sm" className="gradient-gold text-accent-foreground font-semibold" onClick={() => convertToMember.mutate(selectedVisitor)} disabled={convertToMember.isPending}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Convert to Member
                    </Button>
                  )}
                  {selectedVisitor.converted_to_member && (
                    <Badge className="bg-green-100 text-green-700">✓ Converted to Member</Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string | null }) => (
  <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium text-sm">{value || "—"}</p></div>
);

export default Visitors;
