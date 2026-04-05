import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Search, Filter, UserPlus, ArrowLeft, Phone, Mail, MapPin,
  ChevronRight, Users, X, Calendar, Heart, Briefcase, QrCode, Download, IdCard, Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QRCodeSVG } from "qrcode.react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type SpiritualInfo = Tables<"spiritual_info">;

const departments = [
  "All Departments", "Choir", "Ushering", "Media", "Children", "Youth",
  "Women", "Men", "Prayer", "Evangelism", "Welfare"
];

const statusColors: Record<string, string> = {
  member: "bg-primary/10 text-primary border-primary/20",
  visitor: "bg-secondary/10 text-secondary border-secondary/20",
  worker: "bg-accent/10 text-accent-foreground border-accent/20",
};

const MembersList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const generateQR = useMutation({
    mutationFn: async (memberId: string) => {
      const qrCode = `CBC-${memberId.slice(0, 8).toUpperCase()}`;
      const { error } = await supabase.from("profiles").update({ qr_code: qrCode }).eq("id", memberId);
      if (error) throw error;
      return qrCode;
    },
    onSuccess: (qrCode) => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      if (selectedMember) setSelectedMember({ ...selectedMember, qr_code: qrCode } as any);
      toast({ title: "QR Code Generated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: spiritualInfo } = useQuery({
    queryKey: ["spiritual_info", selectedMember?.id],
    queryFn: async () => {
      if (!selectedMember) return null;
      const { data, error } = await supabase
        .from("spiritual_info")
        .select("*")
        .eq("profile_id", selectedMember.id)
        .maybeSingle();
      if (error) throw error;
      return data as SpiritualInfo | null;
    },
    enabled: !!selectedMember,
  });

  const filtered = useMemo(() => {
    if (!profiles) return [];
    const s = search.toLowerCase();
    return profiles.filter((p) => {
      const matchesSearch =
        !search ||
        p.full_name.toLowerCase().includes(s) ||
        p.email?.toLowerCase().includes(s) ||
        p.phone_number?.includes(search) ||
        (p as any).member_code?.toLowerCase().includes(s) ||
        p.address?.toLowerCase().includes(s) ||
        p.city?.toLowerCase().includes(s) ||
        p.occupation?.toLowerCase().includes(s) ||
        (p as any).spouse_name?.toLowerCase().includes(s) ||
        p.qr_code?.toLowerCase().includes(s);
      const matchesStatus = statusFilter === "all" || p.membership_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [profiles, search, statusFilter]);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                Members
              </h1>
              <p className="text-xs text-muted-foreground">
                {filtered.length} member{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/members/register")}
            className="gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90 gap-1.5"
            size="sm"
          >
            <UserPlus className="h-4 w-4" /> Add Member
          </Button>
        </div>
      </header>

      <div className="p-4 lg:p-8 space-y-4">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="member">Members</SelectItem>
                <SelectItem value="visitor">Visitors</SelectItem>
                <SelectItem value="worker">Workers</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[160px] hidden sm:flex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Members Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-0 shadow-sm animate-pulse">
                <CardContent className="p-5 h-28" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No members found</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((member) => (
              <Card
                key={member.id}
                className="border-0 shadow-sm hover:shadow-church transition-all cursor-pointer group"
                onClick={() => setSelectedMember(member)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border-2 border-muted">
                      <AvatarImage src={member.photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm truncate">{member.full_name}</h3>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {member.membership_status && (
                        <Badge variant="outline" className={`text-[10px] mt-1 ${statusColors[member.membership_status] || ""}`}>
                          {member.membership_status}
                        </Badge>
                      )}
                      <div className="mt-2 space-y-0.5">
                        {member.phone_number && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Phone className="h-3 w-3" /> {member.phone_number}
                          </p>
                        )}
                        {member.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                            <Mail className="h-3 w-3 shrink-0" /> {member.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Member Profile Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedMember && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-muted">
                    <AvatarImage src={selectedMember.photo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                      {getInitials(selectedMember.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
                      {selectedMember.full_name}
                    </DialogTitle>
                    {selectedMember.membership_status && (
                      <Badge variant="outline" className={`mt-1 ${statusColors[selectedMember.membership_status] || ""}`}>
                        {selectedMember.membership_status}
                      </Badge>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <Separator className="my-2" />

              {/* Personal Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Personal Info</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoItem icon={Mail} label="Email" value={selectedMember.email} />
                  <InfoItem icon={Phone} label="Phone" value={selectedMember.phone_number} />
                  <InfoItem icon={Phone} label="WhatsApp" value={selectedMember.whatsapp_number} />
                  <InfoItem icon={Calendar} label="DOB" value={selectedMember.date_of_birth} />
                  <InfoItem icon={Users} label="Gender" value={selectedMember.gender} />
                  <InfoItem icon={Heart} label="Marital Status" value={selectedMember.marital_status} />
                  <InfoItem icon={Briefcase} label="Occupation" value={selectedMember.occupation} />
                  <InfoItem icon={MapPin} label="Address" value={selectedMember.address} />
                </div>
              </div>

              <Separator className="my-2" />

              {/* Spiritual Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Spiritual Info</h4>
                {spiritualInfo ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <InfoItem icon={Calendar} label="Salvation Date" value={spiritualInfo.salvation_date} />
                    <InfoItem icon={Calendar} label="Baptism Date" value={spiritualInfo.baptism_date} />
                    <InfoItem icon={Calendar} label="Date Joined" value={spiritualInfo.date_joined} />
                    <InfoItem icon={Users} label="Department" value={spiritualInfo.department} />
                    <InfoItem icon={Heart} label="Ministry" value={spiritualInfo.ministry_involvement} />
                    <InfoItem icon={Heart} label="Spiritual Gifts" value={spiritualInfo.spiritual_gifts} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No spiritual info recorded</p>
                )}
              </div>

              <Separator className="my-2" />

              {/* Emergency Contact */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Emergency Contact</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoItem icon={Users} label="Contact Name" value={selectedMember.emergency_contact_name} />
                  <InfoItem icon={Phone} label="Contact Phone" value={selectedMember.emergency_contact_phone} />
                </div>
                {selectedMember.health_notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Health Notes:</span>
                    <p className="mt-0.5">{selectedMember.health_notes}</p>
                  </div>
                )}
              </div>

              <Separator className="my-2" />

              {/* QR Code */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">QR Code</h4>
                {(selectedMember as any).qr_code ? (
                  <div className="flex flex-col items-center gap-2">
                    <QRCodeSVG value={(selectedMember as any).qr_code} size={150} />
                    <p className="text-xs text-muted-foreground font-mono">{(selectedMember as any).qr_code}</p>
                    <Button variant="outline" size="sm" onClick={() => {
                      const svg = document.querySelector('.qr-container svg');
                      if (!svg) return;
                      const data = new XMLSerializer().serializeToString(svg);
                      const blob = new Blob([data], { type: 'image/svg+xml' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = `qr-${selectedMember.full_name}.svg`; a.click();
                    }}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Download
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => generateQR.mutate(selectedMember.id)} disabled={generateQR.isPending}>
                    <QrCode className="h-4 w-4 mr-1" /> Generate QR Code
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) => (
  <div className="flex items-start gap-2">
    <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-sm">{value || "—"}</p>
    </div>
  </div>
);

export default MembersList;
