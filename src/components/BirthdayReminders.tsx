import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Cake, MessageCircle, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const BirthdayReminders = () => {
  const { data: birthdays } = useQuery({
    queryKey: ["upcoming-birthdays"],
    queryFn: async () => {
      const now = new Date();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, birth_month, birth_day, phone_number, whatsapp_number, email")
        .not("birth_month", "is", null)
        .not("birth_day", "is", null)
        .order("full_name");
      if (error) throw error;

      return (data || []).filter(p => {
        if (!p.birth_month || !p.birth_day) return false;
        for (let i = 0; i < 7; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() + i);
          if (p.birth_month === d.getMonth() + 1 && p.birth_day === d.getDate()) return true;
        }
        return false;
      }).map(p => {
        const today = new Date();
        const isToday = p.birth_month === today.getMonth() + 1 && p.birth_day === today.getDate();
        return { ...p, isToday };
      });
    },
  });

  if (!birthdays || birthdays.length === 0) return null;

  const getWhatsAppLink = (phone: string | null, name: string) => {
    if (!phone) return null;
    const cleaned = phone.replace(/[^0-9+]/g, "").replace(/^0/, "+234");
    const msg = encodeURIComponent(
      `🎂 Happy Birthday, ${name}! 🎉\n\nWishing you a blessed and wonderful birthday filled with God's grace and favour.\n\nFrom your Church Family at Covenant Baptist Church, Suleja ❤️`
    );
    return `https://wa.me/${cleaned.replace("+", "")}?text=${msg}`;
  };

  const getEmailLink = (email: string | null, name: string) => {
    if (!email) return null;
    const subject = encodeURIComponent(`Happy Birthday, ${name}! 🎂`);
    const body = encodeURIComponent(
      `Dear ${name},\n\nHappy Birthday! 🎉\n\nWishing you a blessed and wonderful birthday filled with God's grace, favour and abundant blessings.\n\nFrom your Church Family at Covenant Baptist Church, Suleja ❤️`
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
          <Cake className="h-5 w-5 text-secondary" /> Birthdays This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {birthdays.map(p => {
            const waLink = getWhatsAppLink(p.whatsapp_number || p.phone_number, p.full_name);
            const emailLink = getEmailLink(p.email, p.full_name);
            return (
              <div key={p.id} className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm shrink-0 ${p.isToday ? "bg-secondary text-secondary-foreground" : "bg-muted"}`}>
                  🎂
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {months[p.birth_month!]} {p.birth_day}
                    {p.isToday && <span className="ml-1.5 text-secondary font-semibold">— Today! 🎉</span>}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {waLink && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <a href={waLink} target="_blank" rel="noopener noreferrer" title="Send WhatsApp wish">
                        <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                      </a>
                    </Button>
                  )}
                  {emailLink && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <a href={emailLink} title="Send Email wish">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default BirthdayReminders;
