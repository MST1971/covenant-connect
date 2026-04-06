import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Cake } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const BirthdayReminders = () => {
  const { data: birthdays } = useQuery({
    queryKey: ["upcoming-birthdays"],
    queryFn: async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();

      // Get all profiles with birth_month and birth_day
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, birth_month, birth_day, photo_url")
        .not("birth_month", "is", null)
        .not("birth_day", "is", null)
        .order("full_name");
      if (error) throw error;

      // Filter to upcoming 7 days
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

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
          <Cake className="h-5 w-5 text-secondary" /> Birthdays This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {birthdays.map(p => (
            <div key={p.id} className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${p.isToday ? "bg-secondary text-secondary-foreground" : "bg-muted"}`}>
                🎂
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {months[p.birth_month!]} {p.birth_day}
                  {p.isToday && <span className="ml-1.5 text-secondary font-semibold">— Today! 🎉</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BirthdayReminders;
