import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  ArrowLeft, Plus, Wallet, TrendingUp, TrendingDown, ArrowLeftRight,
  Target, BarChart3, Repeat, Tags, Download, Trash2, Edit, AlertCircle, Paperclip, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart as RePieChart, Pie, Cell,
} from "recharts";

const fmt = (n: number) => `₦${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = ["hsl(var(--primary))","hsl(var(--secondary))","#f59e0b","#10b981","#8b5cf6","#ef4444","#06b6d4","#ec4899","#84cc16","#f97316"];

const Finance = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission, isLoading: roleLoading } = useUserRole();
  const canEdit = hasPermission("finance.edit");
  const canView = hasPermission("finance");
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());

  // ============ QUERIES ============
  const { data: accounts = [] } = useQuery({
    queryKey: ["fin_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("financial_accounts").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: canView,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["fin_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("financial_categories").select("*").order("kind").order("sort_order").order("name");
      if (error) throw error;
      return data;
    },
    enabled: canView,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["fin_txn", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*, financial_categories(name,kind), financial_accounts!financial_transactions_account_id_fkey(name)")
        .gte("txn_date", `${year}-01-01`).lte("txn_date", `${year}-12-31`)
        .order("txn_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: canView,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ["fin_budgets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("financial_budgets").select("*").order("fiscal_year", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: canView,
  });

  const activeBudget = useMemo(() => budgets.find((b: any) => b.fiscal_year === year && b.status === "active") || budgets.find((b: any) => b.fiscal_year === year), [budgets, year]);

  const { data: budgetLines = [] } = useQuery({
    queryKey: ["fin_budget_lines", activeBudget?.id],
    queryFn: async () => {
      if (!activeBudget) return [];
      const { data, error } = await supabase
        .from("financial_budget_lines").select("*, financial_categories(name,kind)")
        .eq("budget_id", activeBudget.id);
      if (error) throw error;
      return data;
    },
    enabled: !!activeBudget,
  });

  const { data: recurring = [] } = useQuery({
    queryKey: ["fin_recurring"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_recurring").select("*, financial_categories(name), financial_accounts(name)")
        .order("next_run_date");
      if (error) throw error;
      return data;
    },
    enabled: canView,
  });

  // ============ DERIVED ============
  const summary = useMemo(() => {
    const income = transactions.filter((t: any) => t.kind === "income" && t.status === "posted").reduce((s, t: any) => s + Number(t.amount), 0);
    const expense = transactions.filter((t: any) => t.kind === "expense" && t.status === "posted").reduce((s, t: any) => s + Number(t.amount), 0);
    const totalBalance = accounts.reduce((s: number, a: any) => s + Number(a.current_balance), 0);
    return { income, expense, net: income - expense, totalBalance };
  }, [transactions, accounts]);

  const monthlyChart = useMemo(() => {
    const data = MONTHS.map((m, i) => ({ month: m, income: 0, expense: 0 }));
    transactions.forEach((t: any) => {
      if (t.status !== "posted") return;
      const m = new Date(t.txn_date).getMonth();
      if (t.kind === "income") data[m].income += Number(t.amount);
      else if (t.kind === "expense") data[m].expense += Number(t.amount);
    });
    return data;
  }, [transactions]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter((t: any) => t.kind === "expense" && t.status === "posted").forEach((t: any) => {
      const name = t.financial_categories?.name || "Uncategorized";
      map[name] = (map[name] || 0) + Number(t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [transactions]);

  // Budget vs Actual
  const comparative = useMemo(() => {
    if (!activeBudget) return [];
    const byCat: Record<string, { id: string; name: string; kind: string; planned: number; actual: number }> = {};
    budgetLines.forEach((bl: any) => {
      const id = bl.category_id;
      if (!byCat[id]) byCat[id] = { id, name: bl.financial_categories?.name || "?", kind: bl.financial_categories?.kind || "expense", planned: 0, actual: 0 };
      byCat[id].planned += Number(bl.planned_amount);
    });
    transactions.forEach((t: any) => {
      if (t.status !== "posted" || !t.category_id) return;
      if (!byCat[t.category_id]) {
        const cat = categories.find((c: any) => c.id === t.category_id);
        if (!cat) return;
        byCat[t.category_id] = { id: t.category_id, name: cat.name, kind: cat.kind, planned: 0, actual: 0 };
      }
      byCat[t.category_id].actual += Number(t.amount);
    });
    return Object.values(byCat).sort((a, b) => (a.kind === b.kind ? b.actual - a.actual : a.kind.localeCompare(b.kind)));
  }, [activeBudget, budgetLines, transactions, categories]);

  // ============ MUTATIONS ============
  const addTxn = useMutation({
    mutationFn: async ({ receiptFile, ...payload }: any) => {
      let receipt_url: string | null = payload.receipt_url || null;
      if (receiptFile instanceof File) {
        const ext = receiptFile.name.split(".").pop() || "bin";
        const path = `${user?.id || "anon"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("receipts").upload(path, receiptFile, { upsert: false });
        if (upErr) throw upErr;
        receipt_url = path;
      }
      const { error } = await supabase.from("financial_transactions").insert({ ...payload, receipt_url, recorded_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Transaction recorded"); qc.invalidateQueries({ queryKey: ["fin_txn"] }); qc.invalidateQueries({ queryKey: ["fin_accounts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTxn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["fin_txn"] }); qc.invalidateQueries({ queryKey: ["fin_accounts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const exportCSV = (rows: any[], filename: string) => {
    if (!rows.length) return toast.error("Nothing to export");
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-secondary border-t-transparent rounded-full" /></div>;
  if (!canView) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md"><CardContent className="p-8 text-center">
        <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h2 className="text-lg font-bold mb-2">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mb-4">Only Finance Officers, Pastors, and Super Admins can access the Finance Center.</p>
        <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </CardContent></Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Finance Center</h1>
              <p className="text-xs text-muted-foreground">{canEdit ? "Full ledger · budgets · reports" : "View-only access"}</p>
            </div>
          </div>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[year+1, year, year-1, year-2].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="p-4 lg:p-8 space-y-6">
        {/* SUMMARY */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Total Balance" value={fmt(summary.totalBalance)} icon={Wallet} tone="primary" />
          <SummaryCard label={`Income ${year}`} value={fmt(summary.income)} icon={TrendingUp} tone="success" />
          <SummaryCard label={`Expense ${year}`} value={fmt(summary.expense)} icon={TrendingDown} tone="danger" />
          <SummaryCard label="Net Surplus" value={fmt(summary.net)} icon={BarChart3} tone={summary.net >= 0 ? "success" : "danger"} />
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expense">Expenditure</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="comparative">Budget vs Actual</TabsTrigger>
            <TabsTrigger value="recurring">Recurrent</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Monthly Income vs Expenditure ({year})</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={monthlyChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="income" fill="hsl(var(--secondary))" name="Income" />
                      <Bar dataKey="expense" fill="#ef4444" name="Expense" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <div className="grid lg:grid-cols-2 gap-6">
              <Card><CardHeader><CardTitle className="text-base">Expense by Category</CardTitle></CardHeader>
                <CardContent>
                  {expenseByCategory.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No expense data</p> : (
                    <div className="h-64"><ResponsiveContainer>
                      <RePieChart>
                        <Pie data={expenseByCategory} dataKey="value" nameKey="name" outerRadius={80} label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`}>
                          {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </RePieChart>
                    </ResponsiveContainer></div>
                  )}
                </CardContent>
              </Card>
              <Card><CardHeader><CardTitle className="text-base">Account Balances</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {accounts.map((a: any) => (
                    <div key={a.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{a.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{a.account_type.replace("_", " ")}</p>
                      </div>
                      <p className="font-bold">{fmt(a.current_balance)}</p>
                    </div>
                  ))}
                  {accounts.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No accounts yet</p>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* INCOME */}
          <TabsContent value="income" className="mt-4">
            <TransactionsPanel
              kind="income" canEdit={canEdit}
              transactions={transactions.filter((t: any) => t.kind === "income")}
              accounts={accounts} categories={categories.filter((c: any) => c.kind === "income")}
              onAdd={(p) => addTxn.mutate({ ...p, kind: "income" })}
              onDelete={(id) => deleteTxn.mutate(id)}
              onExport={() => exportCSV(transactions.filter((t: any) => t.kind === "income").map((t: any) => ({ date: t.txn_date, category: t.financial_categories?.name, account: t.financial_accounts?.name, amount: t.amount, payer: t.payee_or_payer, reference: t.reference, description: t.description })), `income-${year}.csv`)}
            />
          </TabsContent>

          {/* EXPENSE */}
          <TabsContent value="expense" className="mt-4">
            <TransactionsPanel
              kind="expense" canEdit={canEdit}
              transactions={transactions.filter((t: any) => t.kind === "expense")}
              accounts={accounts} categories={categories.filter((c: any) => c.kind === "expense")}
              onAdd={(p) => addTxn.mutate({ ...p, kind: "expense" })}
              onDelete={(id) => deleteTxn.mutate(id)}
              onExport={() => exportCSV(transactions.filter((t: any) => t.kind === "expense").map((t: any) => ({ date: t.txn_date, category: t.financial_categories?.name, account: t.financial_accounts?.name, amount: t.amount, payee: t.payee_or_payer, reference: t.reference, description: t.description })), `expense-${year}.csv`)}
            />
          </TabsContent>

          {/* TRANSFERS */}
          <TabsContent value="transfers" className="mt-4">
            <TransfersPanel
              canEdit={canEdit} accounts={accounts}
              transactions={transactions.filter((t: any) => t.kind === "transfer")}
              onAdd={(p) => addTxn.mutate({ ...p, kind: "transfer" })}
              onDelete={(id) => deleteTxn.mutate(id)}
            />
          </TabsContent>

          {/* BUDGET */}
          <TabsContent value="budget" className="mt-4">
            <BudgetPanel year={year} canEdit={canEdit} budgets={budgets} categories={categories} budgetLines={budgetLines} activeBudget={activeBudget} />
          </TabsContent>

          {/* COMPARATIVE */}
          <TabsContent value="comparative" className="mt-4">
            <ComparativePanel data={comparative} year={year} hasBudget={!!activeBudget} onExport={() => exportCSV(comparative.map(c => ({ category: c.name, kind: c.kind, planned: c.planned, actual: c.actual, variance: c.planned - c.actual })), `budget-vs-actual-${year}.csv`)} />
          </TabsContent>

          {/* RECURRING */}
          <TabsContent value="recurring" className="mt-4">
            <RecurringPanel canEdit={canEdit} recurring={recurring} accounts={accounts} categories={categories} />
          </TabsContent>

          {/* ACCOUNTS */}
          <TabsContent value="accounts" className="mt-4">
            <AccountsPanel canEdit={canEdit} accounts={accounts} />
          </TabsContent>

          {/* CATEGORIES */}
          <TabsContent value="categories" className="mt-4">
            <CategoriesPanel canEdit={canEdit} categories={categories} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ================== SUB COMPONENTS ==================

const SummaryCard = ({ label, value, icon: Icon, tone }: any) => {
  const toneClasses: any = {
    primary: "text-primary bg-primary/10",
    success: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950",
    danger: "text-red-600 bg-red-50 dark:bg-red-950",
  };
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold mt-1" style={{ fontFamily: "var(--font-display)" }}>{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${toneClasses[tone]}`}><Icon className="h-4 w-4" /></div>
      </div>
    </CardContent></Card>
  );
};

const TransactionsPanel = ({ kind, canEdit, transactions, accounts, categories, onAdd, onDelete, onExport }: any) => {
  const [open, setOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [form, setForm] = useState<any>({ txn_date: new Date().toISOString().split("T")[0], amount: "", category_id: "", account_id: "", payee_or_payer: "", description: "", reference: "", payment_method: "cash" });

  const submit = () => {
    if (!form.amount || !form.account_id) return toast.error("Amount and account required");
    onAdd({ ...form, amount: Number(form.amount), receiptFile });
    setOpen(false);
    setReceiptFile(null);
    setForm({ ...form, amount: "", payee_or_payer: "", description: "", reference: "" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base capitalize">{kind} Transactions</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onExport}><Download className="h-4 w-4 mr-1" />Export</Button>
          {canEdit && <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Record {kind}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="capitalize">Record {kind}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date</Label><Input type="date" value={form.txn_date} onChange={e => setForm({...form, txn_date: e.target.value})} /></div>
                  <div><Label>Amount (₦)</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
                </div>
                <div><Label>Category</Label>
                  <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Account</Label>
                  <Select value={form.account_id} onValueChange={v => setForm({...form, account_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{kind === "income" ? "Payer" : "Payee"}</Label><Input value={form.payee_or_payer} onChange={e => setForm({...form, payee_or_payer: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Reference</Label><Input value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} /></div>
                  <div><Label>Method</Label>
                    <Select value={form.payment_method} onValueChange={v => setForm({...form, payment_method: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="mobile_money">Mobile Money</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              </div>
              <DialogFooter><Button onClick={submit}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Account</TableHead><TableHead>{kind === "income" ? "Payer" : "Payee"}</TableHead><TableHead className="text-right">Amount</TableHead>{canEdit && <TableHead></TableHead>}</TableRow></TableHeader>
            <TableBody>
              {transactions.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transactions</TableCell></TableRow> :
                transactions.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{t.txn_date}</TableCell>
                    <TableCell><Badge variant="outline">{t.financial_categories?.name || "—"}</Badge></TableCell>
                    <TableCell className="text-sm">{t.financial_accounts?.name}</TableCell>
                    <TableCell className="text-sm">{t.payee_or_payer || "—"}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{fmt(t.amount)}</TableCell>
                    {canEdit && <TableCell><Button size="icon" variant="ghost" onClick={() => confirm("Delete this transaction?") && onDelete(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

const TransfersPanel = ({ canEdit, accounts, transactions, onAdd, onDelete }: any) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ txn_date: new Date().toISOString().split("T")[0], amount: "", account_id: "", to_account_id: "", description: "" });

  const submit = () => {
    if (!form.amount || !form.account_id || !form.to_account_id) return toast.error("All fields required");
    if (form.account_id === form.to_account_id) return toast.error("Choose different accounts");
    onAdd({ ...form, amount: Number(form.amount) });
    setOpen(false);
    setForm({ ...form, amount: "", description: "" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Account Transfers</CardTitle>
        {canEdit && <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><ArrowLeftRight className="h-4 w-4 mr-1" />New Transfer</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Transfer Between Accounts</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Date</Label><Input type="date" value={form.txn_date} onChange={e => setForm({...form, txn_date: e.target.value})} /></div>
              <div><Label>From Account</Label>
                <Select value={form.account_id} onValueChange={v => setForm({...form, account_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} ({fmt(a.current_balance)})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>To Account</Label>
                <Select value={form.to_account_id} onValueChange={v => setForm({...form, to_account_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Amount (₦)</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
              <div><Label>Note</Label><Textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={submit}>Transfer</Button></DialogFooter>
          </DialogContent>
        </Dialog>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead className="text-right">Amount</TableHead>{canEdit && <TableHead></TableHead>}</TableRow></TableHeader>
          <TableBody>
            {transactions.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transfers</TableCell></TableRow> :
              transactions.map((t: any) => {
                const from = accounts.find((a: any) => a.id === t.account_id);
                const to = accounts.find((a: any) => a.id === t.to_account_id);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{t.txn_date}</TableCell>
                    <TableCell className="text-sm">{from?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{to?.name || "—"}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(t.amount)}</TableCell>
                    {canEdit && <TableCell><Button size="icon" variant="ghost" onClick={() => confirm("Delete?") && onDelete(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const BudgetPanel = ({ year, canEdit, budgets, categories, budgetLines, activeBudget }: any) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState(`${year} Annual Budget`);
  const [editing, setEditing] = useState<Record<string, string>>({});

  const createBudget = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("financial_budgets").insert({ fiscal_year: year, name, status: "active", created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Budget created"); setCreateOpen(false); qc.invalidateQueries({ queryKey: ["fin_budgets"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const upsertLine = useMutation({
    mutationFn: async ({ category_id, month, planned_amount }: any) => {
      const existing = budgetLines.find((bl: any) => bl.category_id === category_id && bl.month === month);
      if (existing) {
        const { error } = await supabase.from("financial_budget_lines").update({ planned_amount }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("financial_budget_lines").insert({ budget_id: activeBudget.id, category_id, month, planned_amount });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fin_budget_lines"] }),
    onError: (e: any) => toast.error(e.message),
  });

  if (!activeBudget) {
    return (
      <Card><CardContent className="p-8 text-center">
        <Target className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">No Budget for {year}</h3>
        <p className="text-sm text-muted-foreground mb-4">Create a budget to start tracking planned vs actual.</p>
        {canEdit && <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Create Budget</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Budget for {year}</DialogTitle></DialogHeader>
            <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <DialogFooter><Button onClick={() => createBudget.mutate()}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>}
      </CardContent></Card>
    );
  }

  const lineValue = (catId: string, m: number) => {
    const k = `${catId}-${m}`;
    if (editing[k] !== undefined) return editing[k];
    const bl = budgetLines.find((b: any) => b.category_id === catId && b.month === m);
    return bl ? String(bl.planned_amount) : "";
  };

  const commit = (catId: string, m: number) => {
    const k = `${catId}-${m}`;
    if (editing[k] === undefined) return;
    const v = Number(editing[k] || 0);
    upsertLine.mutate({ category_id: catId, month: m, planned_amount: v });
    setEditing(prev => { const n = {...prev}; delete n[k]; return n; });
  };

  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-base">{activeBudget.name} · <Badge>{activeBudget.status}</Badge></CardTitle></CardHeader></Card>
      {(["income","expense"] as const).map(kind => (
        <Card key={kind}>
          <CardHeader><CardTitle className="text-base capitalize">{kind} Budget</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="min-w-[160px] sticky left-0 bg-background">Category</TableHead>
                {MONTHS.map(m => <TableHead key={m} className="text-right min-w-[90px]">{m}</TableHead>)}
                <TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {categories.filter((c: any) => c.kind === kind && c.is_active).map((c: any) => {
                  const total = MONTHS.reduce((s, _, i) => {
                    const bl = budgetLines.find((b: any) => b.category_id === c.id && b.month === i+1);
                    return s + Number(bl?.planned_amount || 0);
                  }, 0);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium sticky left-0 bg-background">{c.name}</TableCell>
                      {MONTHS.map((_, i) => (
                        <TableCell key={i} className="p-1">
                          <Input
                            type="number" step="0.01" disabled={!canEdit}
                            className="h-8 text-right text-xs"
                            value={lineValue(c.id, i+1)}
                            onChange={e => setEditing(prev => ({...prev, [`${c.id}-${i+1}`]: e.target.value}))}
                            onBlur={() => commit(c.id, i+1)}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-mono font-bold text-sm">{fmt(total)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const ComparativePanel = ({ data, year, hasBudget, onExport }: any) => {
  if (!hasBudget) return <Card><CardContent className="p-8 text-center text-muted-foreground">Create a budget for {year} first.</CardContent></Card>;
  const income = data.filter((d: any) => d.kind === "income");
  const expense = data.filter((d: any) => d.kind === "expense");

  const Section = ({ title, rows }: any) => (
    <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Planned</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Variance</TableHead><TableHead className="text-right">% Used</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow> :
              rows.map((r: any) => {
                const variance = r.planned - r.actual;
                const pct = r.planned > 0 ? (r.actual / r.planned) * 100 : 0;
                const over = pct > 100;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.planned)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.actual)}</TableCell>
                    <TableCell className={`text-right font-mono ${variance < 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(variance)}</TableCell>
                    <TableCell className={`text-right font-mono ${over ? "text-red-600" : ""}`}>{pct.toFixed(0)}%</TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="outline" size="sm" onClick={onExport}><Download className="h-4 w-4 mr-1" />Export CSV</Button></div>
      <Section title="Income — Budget vs Actual" rows={income} />
      <Section title="Expenditure — Budget vs Actual" rows={expense} />
    </div>
  );
};

const RecurringPanel = ({ canEdit, recurring, accounts, categories }: any) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", kind: "expense", category_id: "", account_id: "", amount: "", frequency: "monthly", day_of_month: 1, start_date: new Date().toISOString().split("T")[0], next_run_date: new Date().toISOString().split("T")[0], auto_post: false, payee_or_payer: "" });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("financial_recurring").insert({ ...form, amount: Number(form.amount), day_of_month: Number(form.day_of_month) });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Recurring added"); setOpen(false); qc.invalidateQueries({ queryKey: ["fin_recurring"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const post = useMutation({
    mutationFn: async (r: any) => {
      const { error } = await supabase.from("financial_transactions").insert({
        txn_date: r.next_run_date, kind: r.kind, category_id: r.category_id, account_id: r.account_id,
        amount: r.amount, payee_or_payer: r.payee_or_payer, description: `Recurring: ${r.name}`, status: "posted",
      });
      if (error) throw error;
      // advance next_run_date
      const next = new Date(r.next_run_date);
      if (r.frequency === "monthly") next.setMonth(next.getMonth()+1);
      else if (r.frequency === "weekly") next.setDate(next.getDate()+7);
      else if (r.frequency === "quarterly") next.setMonth(next.getMonth()+3);
      else next.setFullYear(next.getFullYear()+1);
      await supabase.from("financial_recurring").update({ next_run_date: next.toISOString().split("T")[0], last_run_at: new Date().toISOString() }).eq("id", r.id);
    },
    onSuccess: () => { toast.success("Posted"); qc.invalidateQueries({ queryKey: ["fin_recurring"] }); qc.invalidateQueries({ queryKey: ["fin_txn"] }); qc.invalidateQueries({ queryKey: ["fin_accounts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("financial_recurring").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["fin_recurring"] }); },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recurrent Transactions</CardTitle>
        {canEdit && <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Recurring</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Recurring Transaction</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name (e.g. Pastor Salary)</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={form.kind} onValueChange={v => setForm({...form, kind: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Frequency</Label>
                  <Select value={form.frequency} onValueChange={v => setForm({...form, frequency: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Category</Label>
                <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{categories.filter((c: any) => c.kind === form.kind).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Account</Label>
                <Select value={form.account_id} onValueChange={v => setForm({...form, account_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount (₦)</Label><Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
                <div><Label>Next Run Date</Label><Input type="date" value={form.next_run_date} onChange={e => setForm({...form, next_run_date: e.target.value})} /></div>
              </div>
              <div><Label>Payee/Payer</Label><Input value={form.payee_or_payer} onChange={e => setForm({...form, payee_or_payer: e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={() => add.mutate()}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Category</TableHead><TableHead>Frequency</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Next Run</TableHead>{canEdit && <TableHead></TableHead>}</TableRow></TableHeader>
          <TableBody>
            {recurring.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No recurring transactions</TableCell></TableRow> :
              recurring.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell><Badge variant={r.kind === "income" ? "default" : "secondary"} className="capitalize">{r.kind}</Badge></TableCell>
                  <TableCell className="text-sm">{r.financial_categories?.name || "—"}</TableCell>
                  <TableCell className="text-sm capitalize">{r.frequency}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.amount)}</TableCell>
                  <TableCell className="text-sm">{r.next_run_date}</TableCell>
                  {canEdit && <TableCell className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => post.mutate(r)}>Post Now</Button>
                    <Button size="icon" variant="ghost" onClick={() => confirm("Delete?") && del.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const AccountsPanel = ({ canEdit, accounts }: any) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", account_type: "cash", bank_name: "", account_number: "", opening_balance: 0 });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("financial_accounts").insert({ ...form, opening_balance: Number(form.opening_balance), current_balance: Number(form.opening_balance) });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Account added"); setOpen(false); qc.invalidateQueries({ queryKey: ["fin_accounts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (a: any) => { const { error } = await supabase.from("financial_accounts").update({ is_active: !a.is_active }).eq("id", a.id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fin_accounts"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Cash & Bank Accounts</CardTitle>
        {canEdit && <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New Account</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Account</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Type</Label>
                <Select value={form.account_type} onValueChange={v => setForm({...form, account_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} /></div>
              <div><Label>Account Number</Label><Input value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} /></div>
              <div><Label>Opening Balance (₦)</Label><Input type="number" value={form.opening_balance} onChange={e => setForm({...form, opening_balance: e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={() => add.mutate()}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Bank</TableHead><TableHead className="text-right">Opening</TableHead><TableHead className="text-right">Current</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {accounts.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell className="capitalize">{a.account_type.replace("_"," ")}</TableCell>
                <TableCell className="text-sm">{a.bank_name || "—"} {a.account_number && <span className="text-muted-foreground">· {a.account_number}</span>}</TableCell>
                <TableCell className="text-right font-mono text-sm">{fmt(a.opening_balance)}</TableCell>
                <TableCell className="text-right font-mono font-bold">{fmt(a.current_balance)}</TableCell>
                <TableCell>
                  {canEdit ?
                    <Button size="sm" variant={a.is_active ? "outline" : "secondary"} onClick={() => toggle.mutate(a)}>{a.is_active ? "Active" : "Inactive"}</Button>
                    : <Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Active" : "Inactive"}</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const CategoriesPanel = ({ canEdit, categories }: any) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", kind: "expense" });

  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("financial_categories").insert(form); if (error) throw error; },
    onSuccess: () => { toast.success("Category added"); setOpen(false); setForm({ name: "", kind: "expense" }); qc.invalidateQueries({ queryKey: ["fin_categories"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (c: any) => { const { error } = await supabase.from("financial_categories").update({ is_active: !c.is_active }).eq("id", c.id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fin_categories"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Tags className="h-4 w-4" />Categories</CardTitle>
        {canEdit && <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Category</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Kind</Label>
                <Select value={form.kind} onValueChange={v => setForm({...form, kind: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={() => add.mutate()}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>}
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {(["income","expense"] as const).map(kind => (
            <div key={kind}>
              <h4 className="font-semibold mb-2 capitalize">{kind}</h4>
              <div className="space-y-1">
                {categories.filter((c: any) => c.kind === kind).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded border">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${!c.is_active && "text-muted-foreground line-through"}`}>{c.name}</span>
                      {c.is_system && <Badge variant="outline" className="text-xs">system</Badge>}
                    </div>
                    {canEdit && <Button size="sm" variant="ghost" onClick={() => toggle.mutate(c)}>{c.is_active ? "Disable" : "Enable"}</Button>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Finance;
