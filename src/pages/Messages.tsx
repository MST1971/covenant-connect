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
import { ArrowLeft, MessageSquare, Send, Users, Sparkles, Filter, Eye, Clock, Trash2 } from "lucide-react";
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

// Standardized signature used across all templates
const SIGNATURE = `\n\nWith Love from\nOlawale Raymond\nLead Pastor\nCovenant Baptist Church, Suleja`;

const TEMPLATES: { title: string; body: string; category: string }[] = [
  // ===== Services =====
  {
    category: "Services",
    title: "Sunday Service Reminder",
    body: `Shalom {first_name}! 🌅\n\nThis is a gentle reminder of our Sunday Worship Service tomorrow by 9:00 AM at Covenant Baptist Church, Suleja.\n\nCome expecting a fresh move of God. Invite a friend or family member along.${SIGNATURE}`,
  },
  {
    category: "Services",
    title: "Midweek Bible Study",
    body: `Hello {first_name},\n\nJoin us for our Midweek Bible Study this Wednesday by 5:30 PM. Theme: "Growing Deep in the Word."\n\nCome with your Bible and a hungry heart.${SIGNATURE}`,
  },
  {
    category: "Services",
    title: "Prayer Meeting",
    body: `Beloved {first_name},\n\nOur Prayer Meeting holds tonight by 6:00 PM at the church. "The effectual fervent prayer of a righteous man availeth much" — James 5:16.\n\nCome let us seek the Lord together.${SIGNATURE}`,
  },
  {
    category: "Services",
    title: "Sunday School",
    body: `Good morning {first_name},\n\nDon't miss Sunday School this Sunday by 8:30 AM. It's a great time to study God's Word together before service.\n\nSee you there!${SIGNATURE}`,
  },
  {
    category: "Services",
    title: "Communion Service",
    body: `Dear {first_name},\n\nThis Sunday we will be partaking of the Lord's Supper. Please come prepared, examine your heart (1 Cor 11:28), and let's celebrate the finished work of Christ together.${SIGNATURE}`,
  },

  // ===== Personal / Pastoral =====
  {
    category: "Personal",
    title: "Birthday Greeting",
    body: `Happy Birthday {full_name}! 🎉\n\nFrom your Covenant Baptist Church family — may this new year of your life be filled with God's grace, favour and joy. May the Lord bless you and keep you, and make His face to shine upon you.${SIGNATURE}`,
  },
  {
    category: "Personal",
    title: "Wedding Anniversary",
    body: `Happy Wedding Anniversary {full_name}! 💍\n\nMay your home continue to be filled with love, peace, and the presence of God. We celebrate God's faithfulness over your marriage.${SIGNATURE}`,
  },
  {
    category: "Personal",
    title: "Get-Well Soon",
    body: `Dear {first_name},\n\nWe heard you've not been feeling well. Please know that we are praying for you. By His stripes you are healed (Isaiah 53:5). Reach out if you need anything.${SIGNATURE}`,
  },
  {
    category: "Personal",
    title: "Condolence",
    body: `Dear {full_name},\n\nThe entire Covenant Baptist Church family stands with you at this difficult time. May the God of all comfort wrap you in His peace (2 Cor 1:3-4). We are praying for you.${SIGNATURE}`,
  },
  {
    category: "Personal",
    title: "Welcome New Visitor",
    body: `Hello {first_name},\n\nIt was a delight having you with us at Covenant Baptist Church, Suleja. We pray that God's word ministered to your heart.\n\nWe'd love to have you again — and you are warmly welcome any time.${SIGNATURE}`,
  },
  {
    category: "Personal",
    title: "We Missed You",
    body: `Hello {first_name},\n\nWe noticed you weren't with us at service recently and we missed you. We hope all is well. Please let us know how we can pray with you.${SIGNATURE}`,
  },

  // ===== Stewardship =====
  {
    category: "Stewardship",
    title: "Tithes & Offering Reminder",
    body: `God bless you {first_name} for your faithful giving. 🙏\n\n"Bring ye all the tithes into the storehouse..." — Malachi 3:10.\n\nYou can give in person on Sunday or via the church account. Account details available on request.${SIGNATURE}`,
  },
  {
    category: "Stewardship",
    title: "Thank You for Giving",
    body: `Dear {first_name},\n\nThank you for your faithful giving. Your seed is sown into kingdom work and lives are being touched. May God bless you exceedingly above all you can ask or think.${SIGNATURE}`,
  },
  {
    category: "Stewardship",
    title: "Building Project Appeal",
    body: `Beloved {first_name},\n\nWe are believing God for the completion of our church building project. Every seed counts. Please prayerfully consider your part — together we will see it finished to the glory of God.${SIGNATURE}`,
  },

  // ===== Meetings & Workers =====
  {
    category: "Meetings",
    title: "Workers Meeting",
    body: `Dear Worker {first_name},\n\nThis is a reminder of our Workers Meeting this Saturday by 4:00 PM. Your presence is highly needed as we plan for the move of God ahead.${SIGNATURE}`,
  },
  {
    category: "Meetings",
    title: "Department Meeting",
    body: `Hello {first_name},\n\nThis is a reminder of our department meeting. Please come prepared and on time. Your contribution matters.${SIGNATURE}`,
  },
  {
    category: "Meetings",
    title: "Church Council Meeting",
    body: `Dear {full_name},\n\nKindly be reminded of the Church Council meeting holding soon. Your attendance is important as we deliberate on the affairs of the church.${SIGNATURE}`,
  },
  {
    category: "Meetings",
    title: "Leaders' Retreat",
    body: `Beloved Leader {first_name},\n\nYou are invited to the Leaders' Retreat. It will be a time of refreshing, vision-casting and prayer. Please confirm your attendance.${SIGNATURE}`,
  },

  // ===== Programs / Outreach =====
  {
    category: "Programs",
    title: "Revival / Crusade Invite",
    body: `Dear {first_name},\n\nYou are warmly invited to our upcoming Revival Service. Come and bring someone — God will surely visit us. Don't miss it!${SIGNATURE}`,
  },
  {
    category: "Programs",
    title: "Evangelism Outreach",
    body: `Hello {first_name},\n\nWe are going out for evangelism this Saturday by 8:00 AM. Come let us reach souls together for Christ. "The harvest truly is plenteous..." — Matt 9:37.${SIGNATURE}`,
  },
  {
    category: "Programs",
    title: "Choir Rehearsal",
    body: `Dear {first_name},\n\nReminder: Choir rehearsal holds this week. Please be punctual — we are preparing to minister to the Lord and to His people.${SIGNATURE}`,
  },
  {
    category: "Programs",
    title: "Children/Teens Program",
    body: `Hello {first_name},\n\nKindly bring your children/teens for our special children & teens program this Saturday. It promises to be a fun, life-changing experience.${SIGNATURE}`,
  },
  {
    category: "Programs",
    title: "Thanksgiving Service",
    body: `Dear {first_name},\n\nWe will be holding a Thanksgiving Service this Sunday. Come let us bless the Lord together for His goodness in our lives, families and the church.${SIGNATURE}`,
  },
];

// Variables supported in templates
const SUPPORTED_VARIABLES = [
  { token: "{full_name}", description: "Recipient's full name" },
  { token: "{first_name}", description: "Recipient's first name" },
  { token: "{phone}", description: "Recipient's phone number" },
  { token: "{status}", description: "Membership / visitor status" },
];

const renderMessage = (template: string, recipient?: Recipient): string => {
  const replaceAll = (str: string, token: string, value: string) =>
    str.split(token).join(value);
  if (!recipient) {
    let r = template;
    r = replaceAll(r, "{full_name}", "Friend");
    r = replaceAll(r, "{first_name}", "Friend");
    r = replaceAll(r, "{phone}", "");
    r = replaceAll(r, "{status}", "");
    return r;
  }
  const fullName = recipient.full_name || "Friend";
  const firstName = fullName.split(" ")[0] || "Friend";
  const phone = (recipient as any).whatsapp_number || recipient.phone_number || "";
  const status =
    recipient.source === "member"
      ? (recipient as Member).membership_status || ""
      : "Visitor";
  let r = template;
  r = replaceAll(r, "{full_name}", fullName);
  r = replaceAll(r, "{first_name}", firstName);
  r = replaceAll(r, "{phone}", phone);
  r = replaceAll(r, "{status}", status);
  return r;
};

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
  const [templateCategory, setTemplateCategory] = useState<string>("all");

  // Filters
  const [audience, setAudience] = useState<AudienceType>("members");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [visitorStatusFilter, setVisitorStatusFilter] = useState<string>("all");

  const [scheduledList, setScheduledList] = useState<any[]>([]);
  const [schedTitle, setSchedTitle] = useState("");
  const [schedAt, setSchedAt] = useState("");

  const loadScheduled = async () => {
    const { data } = await supabase.from("scheduled_messages").select("*").order("scheduled_for", { ascending: true });
    setScheduledList(data || []);
  };
  useEffect(() => { if (isAdmin) loadScheduled(); }, [isAdmin]);

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

  const templateCategories = useMemo(
    () => ["all", ...Array.from(new Set(TEMPLATES.map((t) => t.category)))],
    [],
  );

  const filteredTemplates = useMemo(
    () => (templateCategory === "all" ? TEMPLATES : TEMPLATES.filter((t) => t.category === templateCategory)),
    [templateCategory],
  );

  const previewRecipient = useMemo<Recipient | undefined>(() => {
    const firstId = Array.from(selected)[0];
    return allRecipientPool.find((r) => r.id === firstId);
  }, [selected, allRecipientPool]);

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

  const insertVariable = (token: string) => {
    setMessage((m) => `${m}${token}`);
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
      const personalized = renderMessage(message, r);
      const url = `https://wa.me/${raw}?text=${encodeURIComponent(personalized)}`;
      setTimeout(() => window.open(url, "_blank"), i * 250);
    });
    toast.success(`Opening WhatsApp for ${recipients.length} personalized message(s)`);
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
          <p className="text-xs text-muted-foreground">Send personalized WhatsApp broadcasts</p>
        </div>
      </header>

      <div className="p-4 lg:p-8 max-w-5xl mx-auto">
        <Tabs defaultValue="broadcast">
          <TabsList>
            <TabsTrigger value="broadcast">
              <Send className="h-4 w-4 mr-2" /> Broadcast
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Sparkles className="h-4 w-4 mr-2" /> Templates ({TEMPLATES.length})
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
                    rows={8}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message here. Use variables like {first_name} for personalization..."
                  />
                </div>

                <div>
                  <Label className="text-xs">Insert variable</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {SUPPORTED_VARIABLES.map((v) => (
                      <Button
                        key={v.token}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => insertVariable(v.token)}
                        title={v.description}
                      >
                        {v.token}
                      </Button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Variables are replaced per recipient before sending.
                  </p>
                </div>

                {message && (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4" />
                      <p className="text-xs font-semibold">
                        Preview {previewRecipient ? `for ${previewRecipient.full_name}` : "(sample)"}
                      </p>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{renderMessage(message, previewRecipient)}</p>
                  </div>
                )}

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
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {templateCategories.map((c) => (
                    <Button
                      key={c}
                      size="sm"
                      variant={templateCategory === c ? "default" : "outline"}
                      onClick={() => setTemplateCategory(c)}
                      className="capitalize"
                    >
                      {c}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredTemplates.map((t) => (
                    <div key={t.title} className="border rounded-lg p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{t.title}</p>
                        <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-5">{t.body}</p>
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
                </div>
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
