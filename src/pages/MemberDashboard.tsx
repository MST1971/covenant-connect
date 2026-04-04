import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  User, Calendar, Users, Heart, LogOut, Clock, Shield,
  Building2, Edit, ChevronRight, QrCode, Menu, X, Bell
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import churchLogo from "@/assets/church-logo.png";

const MemberDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: myDepartments } = useQuery({
    queryKey: ["my-departments", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_members")
        .select("department_id, departments(name)")
        .eq("profile_id", profile!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  const { data: attendance } = useQuery({
    queryKey: ["my-attendance", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("*, programs(name)")
        .eq("profile_id", profile!.id)
        .order("scan_time", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  const { data: spiritualInfo } = useQuery({
    queryKey: ["my-spiritual", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spiritual_info")
        .select("*")
        .eq("profile_id", profile!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  const { data: familyData } = useQuery({
    queryKey: ["my-family", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("family_members")
        .select("*, families(family_name, household_address)")
        .eq("profile_id", profile!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const navItems = [
    { icon: User, label: "My Profile", id: "profile" },
    { icon: Shield, label: "My Attendance", id: "attendance" },
    { icon: Calendar, label: "Programs", id: "programs" },
    { icon: Building2, label: "My Departments", id: "departments" },
    { icon: Users, label: "My Family", id: "family" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 gradient-navy text-primary-foreground transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 flex items-center gap-3 border-b border-primary-foreground/10">
          <img src={churchLogo} alt="CBC" className="h-10 w-10 rounded-full" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold truncate" style={{ fontFamily: 'var(--font-display)' }}>Covenant Baptist</h2>
            <p className="text-xs opacity-60">Member Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-primary-foreground/10 text-primary-foreground/80 transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="absolute bottom-4 left-3 right-3">
          <button
            onClick={async () => { await signOut(); navigate("/"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-primary-foreground/60 hover:bg-primary-foreground/10 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <main className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>My Dashboard</h1>
              <p className="text-xs text-muted-foreground">Welcome, {profile?.full_name || user?.email?.split('@')[0]}</p>
            </div>
          </div>
          <div className="h-9 w-9 rounded-full gradient-gold flex items-center justify-center text-sm font-bold text-accent-foreground">
            {profile ? getInitials(profile.full_name) : "?"}
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Profile Card */}
          <section id="profile">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle style={{ fontFamily: 'var(--font-display)' }}>My Profile</CardTitle>
                <Button variant="outline" size="sm" onClick={() => navigate(`/members/register?edit=${profile?.id}`)}>
                  <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              </CardHeader>
              <CardContent>
                {profile ? (
                  <div className="flex flex-col sm:flex-row gap-6">
                    <Avatar className="h-20 w-20 border-2 border-muted">
                      <AvatarImage src={profile.photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm flex-1">
                      <ProfileField label="Name" value={profile.full_name} />
                      <ProfileField label="Email" value={profile.email} />
                      <ProfileField label="Phone" value={profile.phone_number} />
                      <ProfileField label="Gender" value={profile.gender} />
                      <ProfileField label="DOB" value={profile.date_of_birth} />
                      <ProfileField label="Address" value={profile.address} />
                      <ProfileField label="Status" value={profile.membership_status} />
                      <ProfileField label="City" value={`${profile.city || ""}, ${profile.state || ""}`} />
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Loading...</p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Attendance History */}
          <section id="attendance">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle style={{ fontFamily: 'var(--font-display)' }}>My Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                {attendance && attendance.length > 0 ? (
                  <div className="space-y-3">
                    {attendance.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Shield className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{log.programs?.name || "Program"}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {new Date(log.scan_time).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                          {log.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No attendance records yet.</p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Departments */}
          <section id="departments">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle style={{ fontFamily: 'var(--font-display)' }}>My Departments</CardTitle>
              </CardHeader>
              <CardContent>
                {myDepartments && myDepartments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {myDepartments.map((dm: any) => (
                      <Badge key={dm.department_id} variant="secondary" className="px-3 py-1.5">
                        <Building2 className="h-3 w-3 mr-1.5" />
                        {dm.departments?.name || "Department"}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Not assigned to any department yet.</p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Family */}
          <section id="family">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle style={{ fontFamily: 'var(--font-display)' }}>My Family</CardTitle>
              </CardHeader>
              <CardContent>
                {familyData && familyData.length > 0 ? (
                  <div className="space-y-2">
                    {familyData.map((fm: any) => (
                      <div key={fm.id} className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                        <div>
                          <p className="text-sm font-medium">{fm.families?.family_name}</p>
                          <p className="text-xs text-muted-foreground">Role: {fm.relationship}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No family records yet.</p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* QR Code */}
          {profile?.qr_code && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle style={{ fontFamily: 'var(--font-display)' }}>My QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-2">
                <QrCode className="h-20 w-20 text-primary" />
                <p className="text-xs font-mono text-muted-foreground">{profile.qr_code}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

const ProfileField = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium">{value || "—"}</p>
  </div>
);

export default MemberDashboard;
