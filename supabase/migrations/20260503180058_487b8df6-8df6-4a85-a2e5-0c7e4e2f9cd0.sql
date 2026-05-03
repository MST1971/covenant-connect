
-- Receipts bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Receipts viewable by finance roles"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts' AND (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_officer') OR
    public.has_role(auth.uid(), 'pastor')
  )
);

CREATE POLICY "Receipts upload by finance"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_officer')
  )
);

CREATE POLICY "Receipts update by finance"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'receipts' AND (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_officer')
  )
);

CREATE POLICY "Receipts delete by finance"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts' AND (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_officer')
  )
);

-- App settings table
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view settings"
ON public.app_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage settings"
ON public.app_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'pastor'));

CREATE TRIGGER trg_app_settings_updated
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default giving receipt toggles
INSERT INTO public.app_settings (key, value) VALUES
('giving_receipts', '{
  "enabled": true,
  "types": {
    "tithe": true,
    "offering": true,
    "donation": true,
    "seed": true,
    "building_fund": true,
    "mission": true,
    "other": true
  },
  "footer_note": "Thank you for your faithful giving. God bless you abundantly."
}'::jsonb);
