
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM ('cash','bank','mobile_money','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.category_kind AS ENUM ('income','expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.txn_kind AS ENUM ('income','expense','transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.txn_status AS ENUM ('pending','posted','void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.budget_status AS ENUM ('draft','active','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.recurring_freq AS ENUM ('weekly','monthly','quarterly','yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ ACCOUNTS ============
CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_type account_type NOT NULL DEFAULT 'cash',
  bank_name text,
  account_number text,
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  current_balance numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ CATEGORIES ============
CREATE TABLE IF NOT EXISTS public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind category_kind NOT NULL,
  parent_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, kind)
);

-- ============ FISCAL YEARS ============
CREATE TABLE IF NOT EXISTS public.financial_fiscal_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL UNIQUE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_closed boolean NOT NULL DEFAULT false,
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_date date NOT NULL DEFAULT CURRENT_DATE,
  kind txn_kind NOT NULL,
  category_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  account_id uuid NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  to_account_id uuid REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payee_or_payer text,
  description text,
  reference text,
  payment_method text DEFAULT 'cash',
  receipt_url text,
  giving_record_id uuid REFERENCES public.giving_records(id) ON DELETE SET NULL,
  status txn_status NOT NULL DEFAULT 'posted',
  recorded_by uuid,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_txn_date ON public.financial_transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_fin_txn_kind ON public.financial_transactions(kind);
CREATE INDEX IF NOT EXISTS idx_fin_txn_cat ON public.financial_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_fin_txn_acct ON public.financial_transactions(account_id);

-- ============ BUDGETS ============
CREATE TABLE IF NOT EXISTS public.financial_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year int NOT NULL,
  name text NOT NULL,
  status budget_status NOT NULL DEFAULT 'draft',
  total_income_planned numeric(14,2) NOT NULL DEFAULT 0,
  total_expense_planned numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(fiscal_year, name)
);

CREATE TABLE IF NOT EXISTS public.financial_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.financial_budgets(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.financial_categories(id) ON DELETE CASCADE,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  planned_amount numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(budget_id, category_id, month)
);

-- ============ RECURRING ============
CREATE TABLE IF NOT EXISTS public.financial_recurring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind txn_kind NOT NULL,
  category_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  account_id uuid NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payee_or_payer text,
  description text,
  frequency recurring_freq NOT NULL DEFAULT 'monthly',
  day_of_month int CHECK (day_of_month BETWEEN 1 AND 31),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  next_run_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  auto_post boolean NOT NULL DEFAULT false,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ TRIGGERS: updated_at ============
DROP TRIGGER IF EXISTS trg_fin_accounts_upd ON public.financial_accounts;
CREATE TRIGGER trg_fin_accounts_upd BEFORE UPDATE ON public.financial_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_fin_categories_upd ON public.financial_categories;
CREATE TRIGGER trg_fin_categories_upd BEFORE UPDATE ON public.financial_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_fin_txn_upd ON public.financial_transactions;
CREATE TRIGGER trg_fin_txn_upd BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_fin_budgets_upd ON public.financial_budgets;
CREATE TRIGGER trg_fin_budgets_upd BEFORE UPDATE ON public.financial_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_fin_budget_lines_upd ON public.financial_budget_lines;
CREATE TRIGGER trg_fin_budget_lines_upd BEFORE UPDATE ON public.financial_budget_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_fin_recurring_upd ON public.financial_recurring;
CREATE TRIGGER trg_fin_recurring_upd BEFORE UPDATE ON public.financial_recurring FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ACCOUNT BALANCE TRIGGER ============
CREATE OR REPLACE FUNCTION public.apply_txn_to_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  delta numeric(14,2);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'posted' THEN
      IF NEW.kind = 'income' THEN
        UPDATE financial_accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
      ELSIF NEW.kind = 'expense' THEN
        UPDATE financial_accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
      ELSIF NEW.kind = 'transfer' AND NEW.to_account_id IS NOT NULL THEN
        UPDATE financial_accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
        UPDATE financial_accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.to_account_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'posted' THEN
      IF OLD.kind = 'income' THEN
        UPDATE financial_accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
      ELSIF OLD.kind = 'expense' THEN
        UPDATE financial_accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
      ELSIF OLD.kind = 'transfer' AND OLD.to_account_id IS NOT NULL THEN
        UPDATE financial_accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
        UPDATE financial_accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.to_account_id;
      END IF;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse OLD if was posted
    IF OLD.status = 'posted' THEN
      IF OLD.kind = 'income' THEN
        UPDATE financial_accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
      ELSIF OLD.kind = 'expense' THEN
        UPDATE financial_accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
      ELSIF OLD.kind = 'transfer' AND OLD.to_account_id IS NOT NULL THEN
        UPDATE financial_accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
        UPDATE financial_accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.to_account_id;
      END IF;
    END IF;
    -- Apply NEW if posted
    IF NEW.status = 'posted' THEN
      IF NEW.kind = 'income' THEN
        UPDATE financial_accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
      ELSIF NEW.kind = 'expense' THEN
        UPDATE financial_accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
      ELSIF NEW.kind = 'transfer' AND NEW.to_account_id IS NOT NULL THEN
        UPDATE financial_accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
        UPDATE financial_accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.to_account_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_apply_txn_balance ON public.financial_transactions;
CREATE TRIGGER trg_apply_txn_balance
AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_txn_to_balance();

-- ============ RLS ============
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_recurring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_fiscal_years ENABLE ROW LEVEL SECURITY;

-- Helper inline expressions
-- Finance editors: super_admin OR finance_officer
-- Viewers: above + pastor

-- accounts
CREATE POLICY "fin_accounts_view" ON public.financial_accounts FOR SELECT TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer') OR has_role(auth.uid(),'pastor'));
CREATE POLICY "fin_accounts_manage" ON public.financial_accounts FOR ALL TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer'))
WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer'));

-- categories
CREATE POLICY "fin_cat_view" ON public.financial_categories FOR SELECT TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer') OR has_role(auth.uid(),'pastor'));
CREATE POLICY "fin_cat_manage" ON public.financial_categories FOR ALL TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer'))
WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer'));

-- transactions
CREATE POLICY "fin_txn_view" ON public.financial_transactions FOR SELECT TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer') OR has_role(auth.uid(),'pastor'));
CREATE POLICY "fin_txn_manage" ON public.financial_transactions FOR ALL TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer'))
WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer'));

-- budgets
CREATE POLICY "fin_bud_view" ON public.financial_budgets FOR SELECT TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer') OR has_role(auth.uid(),'pastor'));
CREATE POLICY "fin_bud_manage" ON public.financial_budgets FOR ALL TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer'))
WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer'));

-- budget lines
CREATE POLICY "fin_budl_view" ON public.financial_budget_lines FOR SELECT TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer') OR has_role(auth.uid(),'pastor'));
CREATE POLICY "fin_budl_manage" ON public.financial_budget_lines FOR ALL TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer'))
WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer'));

-- recurring
CREATE POLICY "fin_rec_view" ON public.financial_recurring FOR SELECT TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer') OR has_role(auth.uid(),'pastor'));
CREATE POLICY "fin_rec_manage" ON public.financial_recurring FOR ALL TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer'))
WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer'));

-- fiscal years
CREATE POLICY "fin_fy_view" ON public.financial_fiscal_years FOR SELECT TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer') OR has_role(auth.uid(),'pastor'));
CREATE POLICY "fin_fy_manage" ON public.financial_fiscal_years FOR ALL TO authenticated
USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer'))
WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'finance_officer'));

-- ============ SEED CATEGORIES ============
INSERT INTO public.financial_categories (name, kind, is_system, sort_order) VALUES
('Tithes','income',true,1),
('Offerings','income',true,2),
('Seed','income',true,3),
('Thanksgiving','income',true,4),
('Project Donations','income',true,5),
('Pledges','income',true,6),
('Other Income','income',true,7),
('Salaries & Allowances','expense',true,1),
('Rent','expense',true,2),
('Utilities (Power/Water)','expense',true,3),
('Missions & Outreach','expense',true,4),
('Welfare','expense',true,5),
('Maintenance & Repairs','expense',true,6),
('Programs & Events','expense',true,7),
('Transport & Fuel','expense',true,8),
('Refreshments','expense',true,9),
('Office & Stationery','expense',true,10),
('Equipment','expense',true,11),
('Bank Charges','expense',true,12),
('Other Expense','expense',true,13)
ON CONFLICT (name, kind) DO NOTHING;

-- ============ SEED DEFAULT ACCOUNT ============
INSERT INTO public.financial_accounts (name, account_type, opening_balance, current_balance, notes)
SELECT 'Main Cash', 'cash', 0, 0, 'Default cash account'
WHERE NOT EXISTS (SELECT 1 FROM public.financial_accounts);

-- ============ SEED CURRENT FISCAL YEAR ============
INSERT INTO public.financial_fiscal_years (year, start_date, end_date)
VALUES (EXTRACT(YEAR FROM CURRENT_DATE)::int,
        DATE_TRUNC('year', CURRENT_DATE)::date,
        (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::date)
ON CONFLICT (year) DO NOTHING;
