-- ============ member_transfers ============
CREATE TABLE IF NOT EXISTS public.member_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  user_id UUID NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  giving_type TEXT NOT NULL DEFAULT 'tithe',
  narration TEXT,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  payment_reference TEXT,
  receipt_url TEXT,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  giving_record_id UUID,
  financial_transaction_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.member_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can create own transfers"
ON public.member_transfers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can view own transfers"
ON public.member_transfers FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'pastor'::app_role)
  OR public.has_role(auth.uid(), 'finance_officer'::app_role)
);

CREATE POLICY "Finance can update transfers"
ON public.member_transfers FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'pastor'::app_role)
  OR public.has_role(auth.uid(), 'finance_officer'::app_role)
);

CREATE POLICY "Finance can delete transfers"
ON public.member_transfers FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'finance_officer'::app_role)
);

CREATE TRIGGER trg_member_transfers_updated
BEFORE UPDATE ON public.member_transfers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_member_transfers_status ON public.member_transfers(status);
CREATE INDEX idx_member_transfers_user ON public.member_transfers(user_id);

-- ============ scheduled_messages ============
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message_body TEXT NOT NULL,
  recipient_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  recipient_audience TEXT NOT NULL DEFAULT 'members',
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage scheduled messages"
ON public.scheduled_messages FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'pastor'::app_role)
  OR public.has_role(auth.uid(), 'secretary'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'pastor'::app_role)
  OR public.has_role(auth.uid(), 'secretary'::app_role)
);

CREATE TRIGGER trg_scheduled_messages_updated
BEFORE UPDATE ON public.scheduled_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_scheduled_messages_for ON public.scheduled_messages(scheduled_for);
CREATE INDEX idx_scheduled_messages_status ON public.scheduled_messages(status);

-- ============ church bank account default settings ============
INSERT INTO public.app_settings (key, value)
VALUES ('church_bank_account', '{"account_name":"Covenant Baptist Church Suleja","account_number":"","bank_name":""}'::jsonb)
ON CONFLICT (key) DO NOTHING;