import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, User, Lock, Bell } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLoading, hasPermission } = useUserRole();

  const [church, setChurch] = useState({
    name: "Covenant Baptist Church",
    address: "Suleja, Niger State, Nigeria",
    phone: "",
    email: "",
    pastor: "Olawale Raymond",
  });
  const [profile, setProfile] = useState({ full_name: "", phone: "" });
  const [pwd, setPwd] = useState({ next: "", confirm: "" });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings" as any).select("*");
      if (data) {
        const map: Record<string, any> = {};
        (data as any[]).forEach((r: any) => (map[r.key] = r.value));
        if (map.church_info) setChurch({ ...church, ...map.church_info });
      }
      if (user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .maybeSingle();
        if (p) setProfile({ full_name: p.full_name || "", phone: p.phone || "" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-secondary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!hasPermission("settings")) return <Navigate to="/dashboard" replace />;

  const saveChurch = async () => {
    const { error } = await supabase
      .from("app_settings" as any)
      .upsert({ key: "church_info", value: church } as any, { onConflict: "key" });
    if (error) return toast.error(error.message);
    toast.success("Church info saved");
  };

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profile.full_name, phone: profile.phone })
      .eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  const changePassword = async () => {
    if (pwd.next.length < 8) return toast.error("Password must be at least 8 characters");
    if (pwd.next !== pwd.confirm) return toast.error("Passwords don't match");
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    if (error) return toast.error(error.message);
    setPwd({ next: "", confirm: "" });
    toast.success("Password updated");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 lg:px-8 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Settings
          </h1>
          <p className="text-xs text-muted-foreground">Manage church and account preferences</p>
        </div>
      </header>

      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <Tabs defaultValue="church">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="church"><Building2 className="h-4 w-4 mr-2" />Church</TabsTrigger>
            <TabsTrigger value="profile"><User className="h-4 w-4 mr-2" />Profile</TabsTrigger>
            <TabsTrigger value="password"><Lock className="h-4 w-4 mr-2" />Password</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" />Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="church">
            <Card>
              <CardHeader><CardTitle>Church Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Name</Label><Input value={church.name} onChange={(e) => setChurch({ ...church, name: e.target.value })} /></div>
                <div><Label>Lead Pastor</Label><Input value={church.pastor} onChange={(e) => setChurch({ ...church, pastor: e.target.value })} /></div>
                <div><Label>Address</Label><Textarea value={church.address} onChange={(e) => setChurch({ ...church, address: e.target.value })} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Phone</Label><Input value={church.phone} onChange={(e) => setChurch({ ...church, phone: e.target.value })} /></div>
                  <div><Label>Email</Label><Input type="email" value={church.email} onChange={(e) => setChurch({ ...church, email: e.target.value })} /></div>
                </div>
                <Button onClick={saveChurch} className="gradient-gold">Save</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader><CardTitle>My Profile</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Email</Label><Input value={user.email || ""} disabled /></div>
                <div><Label>Full Name</Label><Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
                <Button onClick={saveProfile} className="gradient-gold">Save Profile</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card>
              <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>New Password</Label><Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} /></div>
                <div><Label>Confirm Password</Label><Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></div>
                <Button onClick={changePassword} className="gradient-gold">Update Password</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Birthday and attendance reminders are managed via WhatsApp deep links from the dashboard widgets.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
