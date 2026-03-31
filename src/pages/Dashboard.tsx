import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, Calendar, MessageSquare, Heart, BarChart3, Settings,
  ChevronRight, TrendingUp, UserPlus, Clock, Menu, X, LogOut,
  Home, BookOpen, Shield, Bell, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import churchLogo from "@/assets/church-logo.png";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard", active: true },
  { icon: Users, label: "Members", path: "/members" },
  { icon: UserPlus, label: "Visitors", path: "" },
  { icon: BookOpen, label: "Groups", path: "" },
  { icon: Calendar, label: "Events", path: "" },
  { icon: MessageSquare, label: "Messages", path: "" },
  { icon: Heart, label: "Giving", path: "" },
  { icon: Shield, label: "Attendance", path: "" },
  { icon: BarChart3, label: "Reports", path: "" },
  { icon: FileText, label: "Documents", path: "" },
  { icon: Settings, label: "Settings", path: "" },
];

const stats = [
  { label: "Total Members", value: "1,248", icon: Users, change: "+12 this month", color: "bg-primary" },
  { label: "Visitors", value: "34", icon: UserPlus, change: "+8 this week", color: "gradient-gold" },
  { label: "Sunday Attendance", value: "876", icon: Shield, change: "70% capacity", color: "bg-secondary" },
  { label: "Tithes & Offerings", value: "₦2.4M", icon: Heart, change: "+15% vs last month", color: "bg-primary" },
];

const recentActivities = [
  { text: "New member: Adamu Ibrahim registered", time: "2 hours ago", icon: UserPlus },
  { text: "Sunday service attendance recorded: 876", time: "Yesterday", icon: Shield },
  { text: "Birthday messages sent to 12 members", time: "Yesterday", icon: Bell },
  { text: "Youth department meeting scheduled", time: "2 days ago", icon: Calendar },
  { text: "Weekly offering report generated", time: "3 days ago", icon: BarChart3 },
];

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 gradient-navy text-primary-foreground transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 flex items-center gap-3 border-b border-primary-foreground/10">
          <img src={churchLogo} alt="CBC" className="h-10 w-10 rounded-full" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold truncate" style={{ fontFamily: 'var(--font-display)' }}>
              Covenant Baptist
            </h2>
            <p className="text-xs opacity-60">Church Suleja</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => item.path && navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                item.active
                  ? "bg-primary-foreground/15 text-accent"
                  : "hover:bg-primary-foreground/10 text-primary-foreground/80"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
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

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Dashboard</h1>
              <p className="text-xs text-muted-foreground">Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-secondary text-[10px] text-secondary-foreground flex items-center justify-center font-bold">3</span>
            </Button>
            <div className="h-9 w-9 rounded-full gradient-gold flex items-center justify-center text-sm font-bold text-accent-foreground">
              A
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-0 shadow-sm hover:shadow-church transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1" style={{ fontFamily: 'var(--font-display)' }}>
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-secondary" />
                        {stat.change}
                      </p>
                    </div>
                    <div className={`${stat.color} p-2.5 rounded-lg`}>
                      <stat.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle style={{ fontFamily: 'var(--font-display)' }}>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <activity.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{activity.text}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" /> {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle style={{ fontFamily: 'var(--font-display)' }}>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Add New Member", icon: UserPlus, path: "/members/register" },
                  { label: "Record Attendance", icon: Shield },
                  { label: "Send Message", icon: MessageSquare },
                  { label: "Create Event", icon: Calendar },
                  { label: "Record Offering", icon: Heart },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => action.path && navigate(action.path)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-sm"
                  >
                    <span className="flex items-center gap-2.5">
                      <action.icon className="h-4 w-4 text-secondary" />
                      {action.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
