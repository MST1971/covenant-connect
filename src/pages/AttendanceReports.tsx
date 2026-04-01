import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Users, TrendingUp, Calendar, BarChart3, Loader2 } from "lucide-react";
import churchLogo from "@/assets/church-logo.png";

const AttendanceReports = () => {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterProgram, setFilterProgram] = useState("all");

  const { data: programs } = useQuery({
    queryKey: ["programs-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["attendance-report", dateFrom, dateTo, filterProgram],
    queryFn: async () => {
      let query = supabase
        .from("attendance_logs")
        .select("*, profiles(full_name, photo_url), programs(name, day)")
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("date", { ascending: false });

      if (filterProgram !== "all") {
        query = query.eq("program_id", filterProgram);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate stats
      const uniqueMembers = new Set(data?.map(a => a.profile_id));
      const uniqueDates = new Set(data?.map(a => a.date));
      const programCounts: Record<string, number> = {};
      data?.forEach(a => {
        const name = (a.programs as any)?.name || "Unknown";
        programCounts[name] = (programCounts[name] || 0) + 1;
      });

      return {
        logs: data || [],
        totalEntries: data?.length || 0,
        uniqueMembers: uniqueMembers.size,
        totalDays: uniqueDates.size,
        avgPerDay: uniqueDates.size ? Math.round((data?.length || 0) / uniqueDates.size) : 0,
        programCounts,
      };
    },
  });

  const exportCSV = () => {
    if (!reportData?.logs.length) return;
    const headers = "Name,Program,Date,Time,Mode,Status\n";
    const rows = reportData.logs.map(l =>
      `"${(l.profiles as any)?.full_name}","${(l.programs as any)?.name}","${l.date}","${new Date(l.scan_time).toLocaleTimeString()}","${l.scan_mode}","${l.status}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `attendance_${dateFrom}_to_${dateTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 lg:px-8 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-5 w-5" /></Button>
        <img src={churchLogo} alt="CBC" className="h-8 w-8 rounded-full" />
        <div className="flex-1">
          <h1 className="text-lg font-bold">Attendance Reports</h1>
          <p className="text-xs text-muted-foreground">Analytics & export</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!reportData?.logs.length}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </header>

      <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-6">
        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Program</label>
                <Select value={filterProgram} onValueChange={setFilterProgram}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Programs</SelectItem>
                    {programs?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Entries", value: reportData?.totalEntries || 0, icon: BarChart3 },
            { label: "Unique Members", value: reportData?.uniqueMembers || 0, icon: Users },
            { label: "Days Covered", value: reportData?.totalDays || 0, icon: Calendar },
            { label: "Avg per Day", value: reportData?.avgPerDay || 0, icon: TrendingUp },
          ].map(s => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Program Breakdown */}
        {reportData?.programCounts && Object.keys(reportData.programCounts).length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">By Program</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(reportData.programCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-sm">{name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-primary" style={{ width: Math.max(20, (count / reportData.totalEntries) * 200) }} />
                      <Badge variant="outline" className="text-xs">{count}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logs Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Attendance Log</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : !reportData?.logs.length ? (
              <p className="text-center text-sm text-muted-foreground py-8">No attendance records for this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Member</th>
                      <th className="pb-2 font-medium text-muted-foreground">Program</th>
                      <th className="pb-2 font-medium text-muted-foreground">Date</th>
                      <th className="pb-2 font-medium text-muted-foreground">Time</th>
                      <th className="pb-2 font-medium text-muted-foreground">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.logs.slice(0, 100).map(l => (
                      <tr key={l.id} className="border-b last:border-0">
                        <td className="py-2">{(l.profiles as any)?.full_name}</td>
                        <td className="py-2">{(l.programs as any)?.name}</td>
                        <td className="py-2">{l.date}</td>
                        <td className="py-2">{new Date(l.scan_time).toLocaleTimeString()}</td>
                        <td className="py-2"><Badge variant="outline" className="text-xs">{l.scan_mode}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reportData.logs.length > 100 && <p className="text-xs text-muted-foreground text-center mt-2">Showing first 100 of {reportData.logs.length} records</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AttendanceReports;
