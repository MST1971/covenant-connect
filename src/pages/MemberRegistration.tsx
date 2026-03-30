import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, User, Heart, Users, Phone, Camera, Save, Loader2 } from "lucide-react";
import churchLogo from "@/assets/church-logo.png";

const MemberRegistration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    whatsapp_number: "",
    gender: "",
    date_of_birth: "",
    marital_status: "",
    occupation: "",
    education: "",
    address: "",
    city: "",
    state: "Niger",
    country: "Nigeria",
    membership_status: "visitor",
    skills: "",
    // Spiritual
    salvation_date: "",
    baptism_date: "",
    date_joined: "",
    department: "",
    ministry_involvement: "",
    spiritual_gifts: "",
    // Emergency
    emergency_contact_name: "",
    emergency_contact_phone: "",
    health_notes: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Photo must be under 5MB", variant: "destructive" });
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim()) {
      toast({ title: "Name required", description: "Please enter the member's full name.", variant: "destructive" });
      setActiveTab("personal");
      return;
    }

    setSaving(true);
    try {
      let photo_url: string | null = null;

      // Upload photo if selected
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("member-photos")
          .upload(path, photoFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage
          .from("member-photos")
          .getPublicUrl(path);
        photo_url = urlData.publicUrl;
      }

      // Insert profile
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .insert({
          full_name: form.full_name.trim(),
          email: form.email.trim() || null,
          phone_number: form.phone_number.trim() || null,
          whatsapp_number: form.whatsapp_number.trim() || null,
          gender: (form.gender || null) as "male" | "female" | null,
          date_of_birth: form.date_of_birth || null,
          marital_status: (form.marital_status || null) as "single" | "married" | "divorced" | "widowed" | null,
          occupation: form.occupation.trim() || null,
          education: form.education.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          country: form.country.trim() || null,
          membership_status: (form.membership_status || "visitor") as "member" | "visitor" | "worker",
          skills: form.skills.trim() || null,
          emergency_contact_name: form.emergency_contact_name.trim() || null,
          emergency_contact_phone: form.emergency_contact_phone.trim() || null,
          health_notes: form.health_notes.trim() || null,
          photo_url,
        })
        .select("id")
        .single();

      if (profileErr) throw profileErr;

      // Insert spiritual info if any field is filled
      const hasSpiritualInfo =
        form.salvation_date || form.baptism_date || form.date_joined ||
        form.department || form.ministry_involvement || form.spiritual_gifts;

      if (hasSpiritualInfo && profile) {
        const { error: spirErr } = await supabase
          .from("spiritual_info")
          .insert({
            profile_id: profile.id,
            salvation_date: form.salvation_date || null,
            baptism_date: form.baptism_date || null,
            date_joined: form.date_joined || null,
            department: form.department.trim() || null,
            ministry_involvement: form.ministry_involvement.trim() || null,
            spiritual_gifts: form.spiritual_gifts.trim() || null,
          });
        if (spirErr) throw spirErr;
      }

      toast({ title: "Member registered!", description: `${form.full_name} has been added successfully.` });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 lg:px-8 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <img src={churchLogo} alt="CBC" className="h-8 w-8 rounded-full" />
        <div>
          <h1 className="text-lg font-bold">Register New Member</h1>
          <p className="text-xs text-muted-foreground">Add a member to the church database</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 lg:p-8">
        {/* Photo Upload */}
        <div className="flex justify-center mb-6">
          <label className="relative cursor-pointer group">
            <div className="h-28 w-28 rounded-full border-4 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted group-hover:border-secondary transition-colors">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full gradient-gold flex items-center justify-center shadow-gold">
              <Camera className="h-4 w-4 text-accent-foreground" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="personal" className="gap-1 text-xs sm:text-sm">
              <User className="h-3.5 w-3.5 hidden sm:block" /> Personal
            </TabsTrigger>
            <TabsTrigger value="spiritual" className="gap-1 text-xs sm:text-sm">
              <Heart className="h-3.5 w-3.5 hidden sm:block" /> Spiritual
            </TabsTrigger>
            <TabsTrigger value="family" className="gap-1 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 hidden sm:block" /> Family
            </TabsTrigger>
            <TabsTrigger value="emergency" className="gap-1 text-xs sm:text-sm">
              <Phone className="h-3.5 w-3.5 hidden sm:block" /> Emergency
            </TabsTrigger>
          </TabsList>

          {/* Personal Info */}
          <TabsContent value="personal">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input id="full_name" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="e.g. Adamu Ibrahim" maxLength={100} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="email@example.com" maxLength={255} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input id="phone_number" type="tel" value={form.phone_number} onChange={(e) => update("phone_number", e.target.value)} placeholder="+234 800 000 0000" maxLength={20} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
                    <Input id="whatsapp_number" type="tel" value={form.whatsapp_number} onChange={(e) => update("whatsapp_number", e.target.value)} placeholder="+234 800 000 0000" maxLength={20} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input id="date_of_birth" type="date" value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Marital Status</Label>
                    <Select value={form.marital_status} onValueChange={(v) => update("marital_status", v)}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Membership Status</Label>
                    <Select value={form.membership_status} onValueChange={(v) => update("membership_status", v)}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visitor">Visitor</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="worker">Worker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input id="occupation" value={form.occupation} onChange={(e) => update("occupation", e.target.value)} placeholder="e.g. Teacher" maxLength={100} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="education">Education</Label>
                    <Input id="education" value={form.education} onChange={(e) => update("education", e.target.value)} placeholder="e.g. B.Sc Computer Science" maxLength={100} />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Street address" maxLength={255} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="e.g. Suleja" maxLength={100} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="e.g. Niger" maxLength={100} />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="skills">Skills / Talents</Label>
                    <Textarea id="skills" value={form.skills} onChange={(e) => update("skills", e.target.value)} placeholder="e.g. Singing, Ushering, Teaching" maxLength={500} rows={2} />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={() => setActiveTab("spiritual")} className="gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90">
                    Next: Spiritual Info
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Spiritual Info */}
          <TabsContent value="spiritual">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Spiritual Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="salvation_date">Salvation Date</Label>
                    <Input id="salvation_date" type="date" value={form.salvation_date} onChange={(e) => update("salvation_date", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="baptism_date">Baptism Date</Label>
                    <Input id="baptism_date" type="date" value={form.baptism_date} onChange={(e) => update("baptism_date", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="date_joined">Date Joined Church</Label>
                    <Input id="date_joined" type="date" value={form.date_joined} onChange={(e) => update("date_joined", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="department">Department</Label>
                    <Select value={form.department} onValueChange={(v) => update("department", v)}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="choir">Choir</SelectItem>
                        <SelectItem value="ushering">Ushering</SelectItem>
                        <SelectItem value="children">Children's Ministry</SelectItem>
                        <SelectItem value="youth">Youth Ministry</SelectItem>
                        <SelectItem value="men">Men's Fellowship</SelectItem>
                        <SelectItem value="women">Women's Fellowship</SelectItem>
                        <SelectItem value="prayer">Prayer Ministry</SelectItem>
                        <SelectItem value="media">Media / Tech</SelectItem>
                        <SelectItem value="welfare">Welfare</SelectItem>
                        <SelectItem value="evangelism">Evangelism</SelectItem>
                        <SelectItem value="sunday_school">Sunday School</SelectItem>
                        <SelectItem value="protocol">Protocol</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="ministry_involvement">Ministry Involvement</Label>
                    <Textarea id="ministry_involvement" value={form.ministry_involvement} onChange={(e) => update("ministry_involvement", e.target.value)} placeholder="Describe current ministry roles and involvement" maxLength={500} rows={2} />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="spiritual_gifts">Spiritual Gifts</Label>
                    <Textarea id="spiritual_gifts" value={form.spiritual_gifts} onChange={(e) => update("spiritual_gifts", e.target.value)} placeholder="e.g. Teaching, Prophecy, Giving, Hospitality" maxLength={500} rows={2} />
                  </div>
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setActiveTab("personal")}>Back</Button>
                  <Button onClick={() => setActiveTab("family")} className="gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90">
                    Next: Family
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Family Info */}
          <TabsContent value="family">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Family Information</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Family linking can be configured after registration from the Members page.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-muted/50 p-6 text-center space-y-2">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    After registering this member, you can link them to an existing family or create a new family unit from the member's profile page.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Family relationships include: Head, Spouse, Child, Sibling, Parent, Other
                  </p>
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setActiveTab("spiritual")}>Back</Button>
                  <Button onClick={() => setActiveTab("emergency")} className="gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90">
                    Next: Emergency
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emergency Contact */}
          <TabsContent value="emergency">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Emergency Contact & Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="emergency_contact_name">Contact Name</Label>
                    <Input id="emergency_contact_name" value={form.emergency_contact_name} onChange={(e) => update("emergency_contact_name", e.target.value)} placeholder="Emergency contact name" maxLength={100} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                    <Input id="emergency_contact_phone" type="tel" value={form.emergency_contact_phone} onChange={(e) => update("emergency_contact_phone", e.target.value)} placeholder="+234 800 000 0000" maxLength={20} />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="health_notes">Health Notes</Label>
                    <Textarea id="health_notes" value={form.health_notes} onChange={(e) => update("health_notes", e.target.value)} placeholder="Any health conditions, allergies, or special needs to be aware of" maxLength={1000} rows={3} />
                  </div>
                </div>
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setActiveTab("family")}>Back</Button>
                  <Button onClick={handleSubmit} disabled={saving} className="gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90 gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving..." : "Register Member"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MemberRegistration;
