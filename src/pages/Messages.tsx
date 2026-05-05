import { useEffect, useMemo, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Send, Users, Sparkles, Filter } from "lucide-react";
import { toast } from "sonner";

type AudienceType = "members" | "visitors";

interface Member {
  id: string;
  full_name: string;
  phone_number: string | null;
  whatsapp_number?: string | null;
  membership_status: string | null;
  source: "member";
}

interface Visitor {
  id: string;
  full_name: string;
  phone_number: string | null;
  follow_up_status: string | null;
  source: "visitor";
}

type Recipient = Member | Visitor;

interface Department {
  id: string;
  name: string;
}

const COUNCIL_ROLES = ["super_admin", "pastor", "secretary", "department_leader", "finance_officer"];

const TEMPLATES: { title: string; body: string }[] = [
  {
    title: "Sunday Service Reminder",
    body: "Shalom! This is a reminder of our Sunday Service tomorrow by 9:00 AM at Covenant Baptist Church, Suleja. Come expecting a move of God. — Pastor Olawale Raymond",
  },
  {
    title: "Midweek Service",
    body: "Hello! Join us for our Midweek Service this Wednesday by 5:30 PM. Theme: Growing in the Word. God bless you. — CBC Suleja",
  },
  {
    title: "Birthday Greeting",
    body: "Happy Birthday from your Covenant Baptist Church family! May this new year of your life be filled with God's grace, favour and joy. — Pastor Olawale Raymond",
  },
  {
    title: "Welcome New Visitor",
    body: "Hello! It was a delight having you with us at Covenant Baptist Church, Suleja. We pray that God's word ministered to you. We'd love to have you again. — CBC Family",
  },
  {
    title: "Prayer Meeting",
    body: "Beloved, our Prayer Meeting holds tonight by 6:00 PM. Come let us seek the Lord together. — CBC Suleja",
  },
  {
    title: "Tithes & Offering",
    body: "God bless you for your faithful giving. You can give via our church account or in person on Sunday. Malachi 3:10 — CBC Suleja",
  },
  {
    title: "Workers Meeting",
    body: "Dear Worker, please be reminded of our Workers Meeting this Saturday by 4:00 PM. Your presence is highly needed. — CBC Suleja",
  },
  {
    title: "Department Meeting",
    body: "Hello Team! Kindly be reminded of our department meeting. Please come prepared. God bless you. — CBC Suleja",
  },
];

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading, hasPermission } = useUserRole();

  const [members, setMembers] = useState<Member[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentMap, setDepartmentMap] = useState<Record<string, Set<string>>>({});
  const [councilIds, setCouncilIds] = useState<Set<string>>(new Set());

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  // Filters
  const [audience, setAudience] = useState<AudienceType>("members");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // member status
  const [groupFilter, setGroupFilter] = useState<string>("all"); // all | council
  const [visitorStatusFilter, setVisitorStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [membersRes, visitorsRes, deptsRes, deptMembersRes, rolesRes, profilesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone_number, whatsapp_number, membership_status").order("full_name"),
        supabase.from("visitors").select("id, full_name, phone_number, follow_up_status").order("full_name"),
        supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
        supabase.from("department_members").select("department_id, profile_id"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("id, user_id"),
      ]);

      if (membersRes.data) {
        setMembers(membersRes.data.map((m: any) => ({ ...m, source: "member" as const })));
      }
      if (visitorsRes.data) {
        setVisitors(visitorsRes.data.map((v: any) => ({ ...v, source: "visitor" as const })));
      }
      if (deptsRes.data) setDepartments(deptsRes.data as any);

      if (deptMembersRes.data) {
        const map: Record<string, Set<string>> = {};
        for (const dm of deptMembersRes.data as any[]) {
          if (!map[dm.department_id]) map[dm.department_id] = new Set();
          map[dm.department_id].add(dm.profile_id);
        }
        setDepartmentMap(map);
      }

      // Build council = profiles whose user_id has any non-member role
      if (rolesRes.data && profilesRes.data) {
        const councilUserIds = new Set(
          (rolesRes.data as any[])
            .filter((r) => COUNCIL_ROLES.includes(r.role))
            .map((r) => r.user_id),
        );
        const councilProfileIds = new Set(
          (profilesRes.data as any[])
            .filter((p) => p.user_id && councilUserIds.has(p.user_id))
            .map((p) => p.id),
        );
        setCouncilIds(councilProfileIds);
      }
    })();
  }, [isAdmin]);

  const filteredRecipients = useMemo<Recipient[]>(() => {
    const q = search.trim().toLowerCase();

    if (audience === "visitors") {
      return visitors.filter((v) => {
        if (visitorStatusFilter !== "all" && v.follow_up_status !== visitorStatusFilter) return false;
        if (q && !v.full_name.toLowerCase().includes(q)) return false;
        return true;
      });
    }

    let list = members;

    if (statusFilter !== "all") {
      list = list.filter((m) => m.membership_status === statusFilter);
    }

    if (groupFilter === "council") {
      list = list.filter((m) => councilIds.has(m.id));
    }

    if (departmentFilter !== "all") {
      const set = departmentMap[departmentFilter] ?? new Set();
      list = list.filter((m) => set.has(m.id));
    }

    if (q) list = list.filter((m) => m.full_name.toLowerCase().includes(q));

    return list;
  }, [audience, members, visitors, search, statusFilter, groupFilter, departmentFilter, visitorStatusFilter, councilIds, departmentMap]);

  const allRecipientPool: Recipient[] = useMemo(
    () => [...members, ...visitors],
    [members, visitors],
  );

  if (!user) return <Navigate to="/login" replace />;
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-secondary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!hasPermission("messages")) return <Navigate to="/dashboard" replace />;

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const sendWhatsApp = () => {
    if (!message.trim()) return toast.error("Type a message first");
    const recipients = allRecipientPool.filter((r) => {
      if (!selected.has(r.id)) return false;
      const phone = (r as any).whatsapp_number || r.phone_number;
      return !!phone;
    });
    if (recipients.length === 0) return toast.error("Select at least one recipient with a phone number");
    recipients.forEach((r, i) => {
      const raw = ((r as any).whatsapp_number || r.phone_number || "").replace(/\D/g, "");
      const url = `https://wa.me/${raw}?text=${encodeURIComponent(message)}`;
      setTimeout(() => window.open(url, "_blank"), i * 250);
    });
    toast.success(`Opening WhatsApp for ${recipients.length} recipient(s)`);
  };

  const clearFilters = () => {
    setDepartmentFilter("all");
    setStatusFilter("all");
    setGroupFilter("all");
    setVisitorStatusFilter("all");
    setSearch("");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 lg:px-8 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Messages
          </h1>
          <p className="text-xs text-muted-foreground">Send WhatsApp broadcasts to members & visitors</p>
        </div>
      </header>

      <div className="p-4 lg:p-8 max-w-5xl mx-auto">
        <Tabs defaultValue="broadcast">
          <TabsList>
            <TabsTrigger value="broadcast">
              <Send className="h-4 w-4 mr-2" /> Broadcast
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Sparkles className="h-4 w-4 mr-2" /> Templates
            </TabsTrigger>
            <TabsTrigger value="recipients">
              <Users className="h-4 w-4 mr-2" /> Recipients ({selected.size})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="broadcast" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" /> Compose Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Message</Label>
                  <Textarea
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message here..."
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Selected recipients: <span className="font-semibold">{selected.size}</span>
                </p>
                <Button onClick={sendWhatsApp} className="gradient-gold">
                  <Send className="h-4 w-4 mr-2" /> Send via WhatsApp
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" /> Quick Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TEMPLATES.map((t) => (
                  <div key={t.title} className="border rounded-lg p-3 flex flex-col gap-2">
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{t.body}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMessage(t.body);
                        toast.success(`Template "${t.title}" loaded`);
                      }}
                    >
                      Use template
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recipients">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" /> Filter Recipients
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Audience</Label>
                    <Select value={audience} onValueChange={(v) => { setAudience(v as AudienceType); setSelected(new Set()); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="members">Members / Profiles</SelectItem>
                        <SelectItem value="visitors">Visitors</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {audience === "members" ? (
                    <>
                      <div>
                        <Label className="text-xs">Membership Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="worker">Worker</SelectItem>
                            <SelectItem value="visitor">Visitor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Department</Label>
                        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All departments</SelectItem>
                            {departments.map((d) => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Group</Label>
                        <Select value={groupFilter} onValueChange={setGroupFilter}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Everyone</SelectItem>
                            <SelectItem value="council">Church Council (leaders)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div>
                      <Label className="text-xs">Visitor Follow-up</Label>
                      <Select value={visitorStatusFilter} onValueChange={setVisitorStatusFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Input
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    const next = new Set(selected);
                    filteredRecipients.forEach((r) => next.add(r.id));
                    setSelected(next);
                  }}>
                    Select all shown ({filteredRecipients.length})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>
                    Clear selection
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearFilters}>
                    Reset filters
                  </Button>
                </div>

                <div className="border rounded-lg divide-y max-h-[500px] overflow-y-auto">
                  {filteredRecipients.map((r) => {
                    const phone = (r as any).whatsapp_number || r.phone_number;
                    const isCouncil = r.source === "member" && councilIds.has(r.id);
                    return (
                      <label key={r.id} className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer">
                        <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{r.full_name}</p>
                            {r.source === "member" && (r as Member).membership_status && (
                              <Badge variant="secondary" className="text-[10px] capitalize">
                                {(r as Member).membership_status}
                              </Badge>
                            )}
                            {isCouncil && (
                              <Badge className="text-[10px] bg-accent text-accent-foreground">Council</Badge>
                            )}
                            {r.source === "visitor" && (
                              <Badge variant="outline" className="text-[10px]">Visitor</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{phone || "No phone number"}</p>
                        </div>
                      </label>
                    );
                  })}
                  {filteredRecipients.length === 0 && (
                    <p className="p-6 text-center text-sm text-muted-foreground">No recipients match the filters</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Messages;
