import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, KeyRound, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import churchLogo from "@/assets/church-logo.png";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("forgot-password-temp", { body: { email } });
      if (error) throw error;
      if (data?.temp_password) {
        setTempPassword(data.temp_password);
      } else {
        toast({ title: "Request sent", description: data?.message || "Check your email." });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyPw = async () => {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img src={churchLogo} alt="CBC Suleja" className="h-20 w-20 mx-auto mb-4 drop-shadow-xl" />
          <h1 className="text-2xl font-bold text-primary-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Forgot Password
          </h1>
        </div>

        <Card className="shadow-church border-0">
          <CardHeader className="pb-2 pt-6 text-center">
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              {tempPassword ? "Your Temporary Password" : "Reset Your Password"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tempPassword
                ? "Use this password to sign in. We recommend changing it from Settings after login."
                : "Enter your email — a new temporary password will be issued immediately."}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {tempPassword ? (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                  <KeyRound className="h-8 w-8 text-secondary" />
                </div>
                <div className="rounded-lg border bg-muted/50 p-3 flex items-center justify-between gap-2">
                  <code className="text-base font-mono font-bold tracking-wider break-all">{tempPassword}</code>
                  <Button size="sm" variant="outline" onClick={copyPw} className="shrink-0">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  ⚠ Keep this safe. Anyone with this password can access your account until you change it.
                </p>
                <Button className="w-full gradient-gold text-accent-foreground font-semibold shadow-gold" onClick={() => navigate("/login")}>
                  Go to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90"
                >
                  {loading ? "Generating..." : "Get Temporary Password"}
                </Button>
              </form>
            )}
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-1 text-sm text-secondary font-semibold hover:underline mx-auto"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Sign In
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
