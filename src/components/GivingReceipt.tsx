import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface Props {
  record: {
    id: string;
    amount: number;
    giving_type: string;
    payment_method?: string | null;
    date: string;
    reference?: string | null;
    notes?: string | null;
    profiles?: { full_name?: string; member_code?: string | null } | null;
  };
  footerNote?: string;
  onClose: () => void;
}

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const GivingReceipt = ({ record, footerNote, onClose }: Props) => {
  const receiptNo = `CBC/RC/${record.id.slice(0, 8).toUpperCase()}`;
  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:bg-white print:p-0 print:relative print:inset-auto">
      <div className="bg-background rounded-lg w-full max-w-md shadow-xl print:shadow-none print:max-w-full print:rounded-none">
        <div className="flex items-center justify-between p-3 border-b print:hidden">
          <h3 className="font-semibold text-sm">Giving Receipt</h3>
          <div className="flex gap-2">
            <Button size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" />Print</Button>
            <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div id="receipt-print-area" className="p-6 print:p-8">
          <div className="text-center border-b pb-4 mb-4">
            <h1 className="text-lg font-bold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
              COVENANT BAPTIST CHURCH
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Suleja, Niger State, Nigeria</p>
            <p className="text-[10px] text-muted-foreground">Lead Pastor: Olawale Raymond</p>
            <p className="mt-3 inline-block text-xs font-semibold tracking-[0.2em] border-y py-1 px-3">
              OFFICIAL RECEIPT
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs mb-4">
            <div>
              <p className="text-muted-foreground">Receipt No.</p>
              <p className="font-mono font-semibold">{receiptNo}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Date</p>
              <p className="font-semibold">{new Date(record.date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm border-y py-3 mb-4">
            <Row label="Received From" value={record.profiles?.full_name || "—"} />
            {record.profiles?.member_code && <Row label="Member ID" value={record.profiles.member_code} />}
            <Row label="Purpose" value={record.giving_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} />
            <Row label="Payment Method" value={(record.payment_method || "cash").replace(/_/g, " ").toUpperCase()} />
            {record.reference && <Row label="Reference" value={record.reference} />}
          </div>

          <div className="bg-muted/50 rounded-md p-3 text-center mb-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount Received</p>
            <p className="text-2xl font-bold mt-1" style={{ fontFamily: "var(--font-display)" }}>{fmt(record.amount)}</p>
          </div>

          {record.notes && (
            <div className="text-xs text-muted-foreground mb-3">
              <span className="font-semibold">Notes: </span>{record.notes}
            </div>
          )}

          <p className="text-center text-xs italic text-muted-foreground border-t pt-3">
            {footerNote || "Thank you for your faithful giving. God bless you abundantly."}
          </p>

          <div className="grid grid-cols-2 gap-6 mt-8 text-xs">
            <div className="text-center">
              <div className="border-t border-foreground/40 pt-1">Authorized Signature</div>
            </div>
            <div className="text-center">
              <div className="border-t border-foreground/40 pt-1">Church Stamp</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3">
    <span className="text-muted-foreground">{label}:</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);

export default GivingReceipt;
