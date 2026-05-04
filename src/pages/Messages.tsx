import { useEffect, useState } from "react";
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
import { ArrowLeft, MessageSquare, Send, Users } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  full_name: string;
  phone: string | null;
}

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading, hasPermission } = useUserRole();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("members")
        .select("id, full_name, phone")
        .order("full_name");
      if (data) setMembers(data as any);
    })();
  }, [isAdmin]);

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

  const filtered = members.filter((m) =>
    m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const sendWhatsApp = () => {
    if (!message.trim()) return toast.error("Type a message first");
    const recipients = members.filter((m) => selected.has(m.id) && m.phone);
    if (recipients.length === 0) return toast.error("Select at least one member with a phone number");
    recipients.forEach((m, i) => {
      const phone = (m.phone || "").replace(/\D/g, "");
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      setTimeout(() => window.open(url, "_blank"), i * 250);
    });
    toast.success(`Opening WhatsApp for ${recipients.length} recipient(s)`);
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
          <p className="text-xs text-muted-foreground">Send WhatsApp broadcasts to members</p>
        </div>
      </header>

      <div className="p-4 lg:p-8 max-w-5xl mx-auto">
        <Tabs defaultValue="broadcast">
          <TabsList>
            <TabsTrigger value="broadcast">
              <Send className="h-4 w-4 mr-2" /> Broadcast
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

          <TabsContent value="recipients">
            <Card>
              <CardHeader>
                <CardTitle>Select Recipients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Search members..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelected(new Set(filtered.map((m) => m.id)))}>
                    Select all shown
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>
                    Clear
                  </Button>
                </div>
                <div className="border rounded-lg divide-y max-h-[500px] overflow-y-auto">
                  {filtered.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selected.has(m.id)}
                        onCheckedChange={() => toggle(m.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.phone || "No phone number"}
                        </p>
                      </div>
                    </label>
                  ))}
                  {filtered.length === 0 && (
                    <p className="p-6 text-center text-sm text-muted-foreground">No members found</p>
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
