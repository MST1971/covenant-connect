import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, Chrome, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import churchLogo from "@/assets/church-logo.png";

const Login = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);

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
            Covenant Baptist Church
          </h1>
          <p className="text-primary-foreground/70 text-sm">Suleja, Niger State</p>
        </div>

        <Card className="shadow-church border-0">
          <CardHeader className="pb-2 pt-6 text-center">
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignUp ? "Join our church community" : "Sign in to your account"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full gap-2">
                <Chrome className="h-4 w-4" />
                Google
              </Button>
              <Button variant="outline" className="w-full gap-2">
                <Facebook className="h-4 w-4" />
                Facebook
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email
                </TabsTrigger>
                <TabsTrigger value="phone" className="gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </TabsTrigger>
              </TabsList>
              <TabsContent value="email" className="space-y-3 mt-4">
                {isSignUp && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="Enter your full name" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" />
                </div>
                <Button className="w-full gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90">
                  {isSignUp ? "Create Account" : "Sign In"}
                </Button>
              </TabsContent>
              <TabsContent value="phone" className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+234 800 000 0000" />
                </div>
                <Button className="w-full gradient-gold text-accent-foreground font-semibold shadow-gold hover:opacity-90">
                  Send Verification Code
                </Button>
              </TabsContent>
            </Tabs>

            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-secondary font-semibold hover:underline"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-primary-foreground/50 mt-6">
          © 2026 Covenant Baptist Church, Suleja
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
