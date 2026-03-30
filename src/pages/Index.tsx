import { motion } from "framer-motion";
import { Users, Calendar, MessageSquare, Heart, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import churchLogo from "@/assets/church-logo.png";

const features = [
  { icon: Users, title: "Member Management", desc: "Organize & track all church members" },
  { icon: Calendar, title: "Events & Programs", desc: "Plan services, conferences & more" },
  { icon: MessageSquare, title: "Communication", desc: "WhatsApp, SMS & Email messaging" },
  { icon: Heart, title: "Giving & Finance", desc: "Tithes, offerings & donations" },
  { icon: Shield, title: "Attendance", desc: "QR check-in & tracking" },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-hero text-primary-foreground overflow-hidden">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={churchLogo} alt="Covenant Baptist Church Suleja" className="h-12 w-12 rounded-full" />
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Covenant Baptist Church
            </h1>
            <p className="text-xs opacity-75">Suleja, Niger State</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
          onClick={() => navigate("/login")}
        >
          Sign In
        </Button>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <img
            src={churchLogo}
            alt="Covenant Baptist Church Suleja Logo"
            className="mx-auto h-32 w-32 mb-8 drop-shadow-2xl"
          />
          <h2
            className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Church Membership
            <span className="block text-gradient-gold">Management System</span>
          </h2>
          <p className="text-lg md:text-xl opacity-80 max-w-2xl mx-auto mb-10">
            Empowering Covenant Baptist Church, Suleja to manage members, communicate effectively, and grow together in faith.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gradient-gold text-accent-foreground font-semibold text-lg px-8 shadow-gold hover:opacity-90 transition-opacity"
              onClick={() => navigate("/login")}
            >
              Get Started <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-lg px-8"
              onClick={() => navigate("/login")}
            >
              Member Login
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-primary-foreground/15 transition-colors"
            >
              <f.icon className="h-8 w-8 mx-auto mb-3 text-accent" />
              <h3 className="font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>{f.title}</h3>
              <p className="text-sm opacity-70">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary-foreground/10 py-6">
        <div className="container mx-auto px-4 text-center text-sm opacity-60">
          © 2026 Covenant Baptist Church, Suleja. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
