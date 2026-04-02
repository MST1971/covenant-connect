import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, CameraOff, CheckCircle2, XCircle, Loader2, QrCode } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import churchLogo from "@/assets/church-logo.png";

type ScanMode = "general" | "department";

type ScanResult = {
  name: string;
  status: string;
  programs: string[];
  missedPrograms: string[];
  whatsappNumber: string | null;
  scanTime: string;
  scanDate: string;
};

const ScanAttendance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [scanMode, setScanMode] = useState<ScanMode>("general");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: todayPrograms } = useQuery({
    queryKey: ["programs-today"],
    queryFn: async () => {
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const today = dayNames[new Date().getDay()];
      const { data, error } = await supabase.from("programs").select("*").eq("day", today).eq("is_active", true).order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const { data: todayStats } = useQuery({
    queryKey: ["attendance-today"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("attendance_logs").select("id, profile_id").eq("date", today);
      if (error) throw error;
      const uniqueMembers = new Set(data?.map(a => a.profile_id));
      return { total: data?.length || 0, uniqueMembers: uniqueMembers.size };
    },
    refetchInterval: 5000,
  });

  const markAttendance = useMutation({
    mutationFn: async (qrCode: string) => {
      // Find member by QR code
      const { data: member, error: memberErr } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("qr_code", qrCode)
        .single();
      if (memberErr || !member) throw new Error("Member not found. Invalid QR code.");

      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const currentTime = now.toTimeString().slice(0, 8);

      if (scanMode === "department") {
        if (!selectedDeptId) throw new Error("Please select a department first.");
        // Verify member belongs to department
        const { data: deptMember } = await supabase
          .from("department_members")
          .select("id")
          .eq("department_id", selectedDeptId)
          .eq("profile_id", member.id)
          .single();
        if (!deptMember) throw new Error(`Access Denied: ${member.full_name} is not a member of this department.`);
      }

      // Get all active programs for today
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const todayDay = dayNames[now.getDay()];
      const { data: programs } = await supabase
        .from("programs")
        .select("*")
        .eq("day", todayDay)
        .eq("is_active", true);

      if (!programs?.length) throw new Error("No programs scheduled for today.");

      const markedPrograms: string[] = [];

      if (scanMode === "general") {
        // Mark present for all programs where scan_time <= end_time
        for (const prog of programs) {
          if (currentTime <= prog.end_time) {
            const { error: insertErr } = await supabase.from("attendance_logs").upsert(
              { profile_id: member.id, program_id: prog.id, date: today, scan_time: now.toISOString(), scan_mode: "general", status: "present" },
              { onConflict: "profile_id,program_id,date" }
            );
            if (!insertErr) markedPrograms.push(prog.name);
          }
        }
      } else {
        // Department mode — mark for current active program
        const activeProgram = programs.find(p => currentTime >= p.start_time && currentTime <= p.end_time);
        if (activeProgram) {
          const { error: insertErr } = await supabase.from("attendance_logs").upsert(
            { profile_id: member.id, program_id: activeProgram.id, department_id: selectedDeptId, date: today, scan_time: now.toISOString(), scan_mode: "department", status: "present" },
            { onConflict: "profile_id,program_id,date" }
          );
          if (!insertErr) markedPrograms.push(activeProgram.name);
        }
      }

      if (!markedPrograms.length) {
        return { name: member.full_name, status: "already_scanned", programs: [] };
      }

      return { name: member.full_name, status: "success", programs: markedPrograms };
    },
    onSuccess: (result) => {
      setLastResult(result);
      qc.invalidateQueries({ queryKey: ["attendance-today"] });
      if (result.status === "already_scanned") {
        toast({ title: "Already Scanned", description: `${result.name} has already been recorded.` });
      } else {
        toast({ title: "✅ Attendance Recorded", description: `${result.name} — ${result.programs.join(", ")}` });
      }
    },
    onError: (e: any) => {
      setLastResult({ name: "", status: "error", programs: [e.message] });
      toast({ title: "Scan Error", description: e.message, variant: "destructive" });
    },
  });

  const startScanner = useCallback(async () => {
    if (!scannerContainerRef.current) return;
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          markAttendance.mutate(decodedText);
        },
        () => {}
      );
      setScanning(true);
    } catch (err: any) {
      toast({ title: "Camera Error", description: err?.message || "Could not access camera", variant: "destructive" });
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 lg:px-8 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { stopScanner(); navigate("/dashboard"); }}><ArrowLeft className="h-5 w-5" /></Button>
        <img src={churchLogo} alt="CBC" className="h-8 w-8 rounded-full" />
        <div className="flex-1">
          <h1 className="text-lg font-bold">Scan Attendance</h1>
          <p className="text-xs text-muted-foreground">QR Code Check-in</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{todayStats?.uniqueMembers || 0}</p>
              <p className="text-xs text-muted-foreground">Members Today</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{todayPrograms?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Programs Today</p>
            </CardContent>
          </Card>
        </div>

        {/* Mode Selection */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={scanMode === "general" ? "default" : "outline"} onClick={() => setScanMode("general")} className={scanMode === "general" ? "gradient-navy" : ""}>
                General
              </Button>
              <Button variant={scanMode === "department" ? "default" : "outline"} onClick={() => setScanMode("department")} className={scanMode === "department" ? "gradient-navy" : ""}>
                Department
              </Button>
            </div>
            {scanMode === "department" && (
              <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Scanner */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div id="qr-reader" ref={scannerContainerRef} className="w-full" style={{ minHeight: scanning ? 300 : 0 }} />
            {!scanning && (
              <div className="p-8 text-center">
                <QrCode className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <Button onClick={startScanner} className="gradient-gold text-accent-foreground font-semibold shadow-gold">
                  <Camera className="h-4 w-4 mr-2" /> Start Scanner
                </Button>
              </div>
            )}
            {scanning && (
              <div className="p-3 text-center">
                <Button variant="destructive" onClick={stopScanner}><CameraOff className="h-4 w-4 mr-2" /> Stop Scanner</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Result */}
        {lastResult && (
          <Card className={`border-0 shadow-sm ${lastResult.status === "success" ? "bg-green-50 dark:bg-green-950/20" : lastResult.status === "error" ? "bg-red-50 dark:bg-red-950/20" : "bg-yellow-50 dark:bg-yellow-950/20"}`}>
            <CardContent className="p-4 flex items-start gap-3">
              {lastResult.status === "success" ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{lastResult.name || "Scan Result"}</p>
                {lastResult.status === "success" && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {lastResult.programs.map(p => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
                  </div>
                )}
                {lastResult.status === "error" && <p className="text-sm text-destructive">{lastResult.programs[0]}</p>}
                {lastResult.status === "already_scanned" && <p className="text-sm text-muted-foreground">Already recorded today</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Programs */}
        {todayPrograms && todayPrograms.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Today's Programs</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {todayPrograms.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">{p.start_time?.slice(0, 5)} - {p.end_time?.slice(0, 5)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ScanAttendance;
