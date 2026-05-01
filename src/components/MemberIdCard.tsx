import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface MemberIdCardProps {
  member: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHURCH_NAME = "Covenant Baptist Church";
const CHURCH_LOCATION = "Suleja, Niger State";
const CHURCH_ADDRESS = "Suleja, Niger State, Nigeria";

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export const MemberIdCard = ({ member, open, onOpenChange }: MemberIdCardProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;
    const html = node.innerHTML;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>ID Card — ${member.full_name}</title>
      <style>
        @page { size: 90mm 110mm; margin: 4mm; }
        body { font-family: Inter, Arial, sans-serif; margin: 0; padding: 8mm; background: #fff; color: #111; }
        .cards { display: flex; flex-direction: column; gap: 6mm; }
        .card { width: 85.6mm; height: 53.98mm; border-radius: 3mm; overflow: hidden; box-shadow: 0 0 0 0.2mm #1a2c5b; position: relative; page-break-inside: avoid; }
        .front { background: linear-gradient(135deg,#1a2c5b 0%,#2a3f7a 60%,#f4a623 140%); color: #fff; display: grid; grid-template-columns: 28mm 1fr; }
        .photo-wrap { padding: 3mm; display:flex; align-items:center; justify-content:center; }
        .photo { width: 22mm; height: 28mm; border-radius: 2mm; object-fit: cover; background:#fff; border: 0.4mm solid #f4a623; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:10mm; color:#1a2c5b; }
        .info { padding: 3mm 3mm 3mm 0; display:flex; flex-direction:column; justify-content:space-between; }
        .church { font-family: 'Playfair Display', Georgia, serif; font-size: 3.4mm; font-weight: 700; letter-spacing: 0.2mm; }
        .loc { font-size: 2.2mm; opacity: 0.85; margin-top: 0.5mm; }
        .name { font-size: 4mm; font-weight: 700; margin-top: 2mm; line-height: 1.1; }
        .role { font-size: 2.4mm; opacity: 0.9; margin-top: 0.5mm; text-transform: capitalize; }
        .code { background:#f4a623; color:#1a2c5b; font-weight:700; font-size:2.8mm; padding: 1mm 2mm; border-radius: 1mm; align-self:flex-start; margin-top: 2mm; font-family: ui-monospace, monospace; }
        .back { background:#fff; color:#1a2c5b; padding: 3mm; display: grid; grid-template-columns: 26mm 1fr; gap: 3mm; border: 0.3mm solid #1a2c5b; }
        .qr { display:flex; align-items:center; justify-content:center; }
        .qr svg { width: 24mm; height: 24mm; }
        .back-info { font-size: 2.4mm; line-height: 1.4; }
        .back-title { font-family:'Playfair Display', Georgia, serif; font-weight: 700; font-size: 3.2mm; margin-bottom: 1.5mm; color:#1a2c5b; }
        .label { color:#666; font-size:2mm; text-transform:uppercase; letter-spacing:0.3mm; }
        .val { font-weight:600; font-size:2.4mm; margin-bottom:1mm; }
        .footer-strip { position:absolute; bottom:0; left:0; right:0; height: 2mm; background: linear-gradient(90deg,#1a2c5b,#f4a623); }
        @media print { body { padding: 0; } }
      </style>
    </head><body><div class="cards">${html}</div>
    <script>window.onload=()=>{setTimeout(()=>{window.print();},300);};</script>
    </body></html>`);
    win.document.close();
  };

  const code = (member as any).member_code || "—";
  const qrValue = (member as any).qr_code || (member as any).member_code || member.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
            Member ID Card — {member.full_name}
          </DialogTitle>
        </DialogHeader>

        {/* Preview (uses inline styles so print mirrors exactly) */}
        <div ref={printRef}>
          {/* FRONT */}
          <div className="card front" style={{
            width: "85.6mm", height: "53.98mm", borderRadius: "3mm", overflow: "hidden",
            background: "linear-gradient(135deg,#1a2c5b 0%,#2a3f7a 60%,#f4a623 140%)",
            color: "#fff", display: "grid", gridTemplateColumns: "28mm 1fr",
            boxShadow: "0 0 0 0.2mm #1a2c5b", position: "relative", marginBottom: "6mm",
          }}>
            <div className="photo-wrap" style={{ padding: "3mm", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div className="photo" style={{
                width: "22mm", height: "28mm", borderRadius: "2mm", overflow: "hidden",
                background: "#fff", border: "0.4mm solid #f4a623", display: "flex",
                alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "10mm", color: "#1a2c5b",
              }}>
                {member.photo_url ? (
                  <img src={member.photo_url} alt={member.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  getInitials(member.full_name)
                )}
              </div>
            </div>
            <div className="info" style={{ padding: "3mm 3mm 3mm 0", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div className="church" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "3.4mm", fontWeight: 700, letterSpacing: "0.2mm" }}>
                  {CHURCH_NAME}
                </div>
                <div className="loc" style={{ fontSize: "2.2mm", opacity: 0.85, marginTop: "0.5mm" }}>{CHURCH_LOCATION}</div>
                <div className="name" style={{ fontSize: "4mm", fontWeight: 700, marginTop: "2mm", lineHeight: 1.1 }}>{member.full_name}</div>
                <div className="role" style={{ fontSize: "2.4mm", opacity: 0.9, marginTop: "0.5mm", textTransform: "capitalize" }}>
                  {member.membership_status || "Member"}
                </div>
              </div>
              <div className="code" style={{
                background: "#f4a623", color: "#1a2c5b", fontWeight: 700, fontSize: "2.8mm",
                padding: "1mm 2mm", borderRadius: "1mm", alignSelf: "flex-start", marginTop: "2mm",
                fontFamily: "ui-monospace, monospace",
              }}>{code}</div>
            </div>
            <div className="footer-strip" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2mm", background: "linear-gradient(90deg,#1a2c5b,#f4a623)" }} />
          </div>

          {/* BACK */}
          <div className="card back" style={{
            width: "85.6mm", height: "53.98mm", borderRadius: "3mm", background: "#fff",
            color: "#1a2c5b", padding: "3mm", display: "grid", gridTemplateColumns: "26mm 1fr",
            gap: "3mm", border: "0.3mm solid #1a2c5b", position: "relative", overflow: "hidden",
          }}>
            <div className="qr" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <QRCodeSVG value={String(qrValue)} size={90} level="M" includeMargin={false} />
            </div>
            <div className="back-info" style={{ fontSize: "2.4mm", lineHeight: 1.4 }}>
              <div className="back-title" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: "3.2mm", marginBottom: "1.5mm" }}>
                Member Details
              </div>
              <div className="label" style={{ color: "#666", fontSize: "2mm", textTransform: "uppercase", letterSpacing: "0.3mm" }}>Phone</div>
              <div className="val" style={{ fontWeight: 600, fontSize: "2.4mm", marginBottom: "1mm" }}>{member.phone_number || "—"}</div>
              <div className="label" style={{ color: "#666", fontSize: "2mm", textTransform: "uppercase", letterSpacing: "0.3mm" }}>Emergency Contact</div>
              <div className="val" style={{ fontWeight: 600, fontSize: "2.4mm", marginBottom: "1mm" }}>
                {member.emergency_contact_name || "—"}{member.emergency_contact_phone ? ` · ${member.emergency_contact_phone}` : ""}
              </div>
              <div className="label" style={{ color: "#666", fontSize: "2mm", textTransform: "uppercase", letterSpacing: "0.3mm" }}>Address</div>
              <div className="val" style={{ fontWeight: 600, fontSize: "2.4mm" }}>{CHURCH_ADDRESS}</div>
            </div>
            <div className="footer-strip" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2mm", background: "linear-gradient(90deg,#f4a623,#1a2c5b)" }} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" /> Close
          </Button>
          <Button onClick={handlePrint} className="gradient-gold text-accent-foreground">
            <Printer className="h-4 w-4 mr-1" /> Print Card
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
