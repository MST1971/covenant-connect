
-- Add new columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_month integer,
ADD COLUMN IF NOT EXISTS birth_day integer,
ADD COLUMN IF NOT EXISTS marriage_date date,
ADD COLUMN IF NOT EXISTS spouse_name text,
ADD COLUMN IF NOT EXISTS member_code text UNIQUE;

-- Create giving_records table
CREATE TABLE public.giving_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  giving_type text NOT NULL DEFAULT 'tithe',
  payment_method text DEFAULT 'cash',
  date date NOT NULL DEFAULT CURRENT_DATE,
  reference text,
  notes text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.giving_records ENABLE ROW LEVEL SECURITY;

-- Members can view their own giving records
CREATE POLICY "Users can view own giving" ON public.giving_records
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = giving_records.profile_id AND profiles.user_id = auth.uid())
);

-- Admins can manage all giving records
CREATE POLICY "Admins can manage giving" ON public.giving_records
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'finance_officer')
);

-- Create visitors table
CREATE TABLE public.visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone_number text,
  email text,
  address text,
  gender text,
  age_range text,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  invited_by_name text,
  invited_by_member_id uuid REFERENCES public.profiles(id),
  program_attended text,
  follow_up_status text NOT NULL DEFAULT 'pending',
  follow_up_notes text,
  follow_up_date date,
  assigned_to uuid REFERENCES public.profiles(id),
  converted_to_member boolean NOT NULL DEFAULT false,
  converted_profile_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- Authenticated can view visitors
CREATE POLICY "Authenticated can view visitors" ON public.visitors
FOR SELECT TO authenticated USING (true);

-- Admins can manage visitors
CREATE POLICY "Admins can manage visitors" ON public.visitors
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'secretary')
);

-- Create member_id_counters table for sequential ID generation
CREATE TABLE public.member_id_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_type text NOT NULL UNIQUE,
  last_number integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.member_id_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage counters" ON public.member_id_counters
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'pastor'));

-- Seed counters
INSERT INTO public.member_id_counters (counter_type, last_number) VALUES ('family', 0), ('single', 0);
