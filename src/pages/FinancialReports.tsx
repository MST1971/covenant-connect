import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, DollarSign, TrendingUp, Calendar, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--secondary))",
  "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4",
];

const FinancialReports = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  const { data: records } = useQuery({
    queryKey: ["giving-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("giving_records")
        .select("*, profiles(full_name)")
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    if (!records || records.length === 0) return null;

    const total = records.reduce((s, r: any) => s + Number(r.amount), 0);
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthTotal = records.filter((r: any) => {
      const d = new Date(r.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).reduce((s, r: any) => s + Number(r.amount), 0);

    // By type
    const byType: Record<string, number> = {};
    records.forEach((r: any) => {
      byType[r.giving_type] = (byType[r.giving_type] || 0) + Number(r.amount);
    });
    const typeData = Object.entries(byType).map(([name, value]) => ({
      name: name.replace("_", " "),
      value,
    }));

    // By period
    const grouped: Record<string, number> = {};
    records.forEach((r: any) => {
      const d = new Date(r.date);
      let key: string;
      if (period === "week") {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else if (period === "month") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      } else {
        key = String(d.getFullYear());
      }
      grouped[key] = (grouped[key] || 0) + Number(r.amount);
    });
    const trendData = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        date: period === "month" ? formatMonth(date) : date,
        amount,
      }));

    // By payment method
    const byMethod: Record<string, number> = {};
    records.forEach((r: any) => {
      const m = r.payment_method || "unknown";
      byMethod[m] = (byMethod[m] || 0) + Number(r.amount);
    });
    const methodData = Object.entries(byMethod).map(([name, value]) => ({ name, value }));

    // Top givers
    const byMember: Record<string, { name: string; total: number }> = {};
    records.forEach((r: any) => {
      const id = r.profile_id;
      if (!byMember[id]) byMember[id] = { name: r.profiles?.full_name || "Unknown", total: 0 };
      byMember[id].total += Number(r.amount);
    });
    const topGivers = Object.values(byMember).sort((a, b) => b.total - a.total).slice(0, 5);

    return { total, monthTotal, typeData, trendData, methodData, topGivers, count: records.length };
  }, [records, period]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Financial Reports</h1>
              <p className="text-xs text-muted-foreground">Giving trends & analytics</p>
            </div>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="p-4 lg:p-8 space-y-6">
        {!stats ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No giving data yet</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Giving", value: `₦${stats.total.toLocaleString()}`, icon: DollarSign },
                { label: "This Month", value: `₦${stats.monthTotal.toLocaleString()}`, icon: Calendar },
                { label: "Total Records", value: stats.count.toString(), icon: TrendingUp },
                { label: "Giving Types", value: stats.typeData.length.toString(), icon: PieChart },
              ].map((s) => (
                <Card key={s.label} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                    <p className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Trend Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base" style={{ fontFamily: "var(--font-display)" }}>
                  Giving Trend ({period === "week" ? "Weekly" : period === "month" ? "Monthly" : "Yearly"})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => [`₦${v.toLocaleString()}`, "Amount"]} />
                      <Area type="monotone" dataKey="amount" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pie Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base" style={{ fontFamily: "var(--font-display)" }}>By Giving Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie data={stats.typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {stats.typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base" style={{ fontFamily: "var(--font-display)" }}>By Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.methodData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
                        <Bar dataKey="value" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Givers */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base" style={{ fontFamily: "var(--font-display)" }}>Top Givers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topGivers.map((g, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{i + 1}</div>
                        <p className="text-sm font-medium">{g.name}</p>
                      </div>
                      <p className="font-bold text-sm">₦{g.total.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

const formatMonth = (key: string) => {
  const [y, m] = key.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
};

export default FinancialReports;
