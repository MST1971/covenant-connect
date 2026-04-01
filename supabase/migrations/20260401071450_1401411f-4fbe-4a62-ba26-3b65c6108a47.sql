
-- Add qr_code column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS qr_code text UNIQUE;

-- Programs table (church activities/services)
CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  day text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  grace_period interval DEFAULT '15 minutes',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view programs" ON public.programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage programs" ON public.programs FOR ALL TO authenticated USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'secretary')
);

-- Departments table
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  leader_id uuid REFERENCES public.profiles(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL TO authenticated USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'secretary')
);

-- Department members linking table
CREATE TABLE public.department_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(department_id, profile_id)
);

ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view department members" ON public.department_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage department members" ON public.department_members FOR ALL TO authenticated USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'secretary') OR has_role(auth.uid(), 'department_leader')
);

-- Attendance logs table
CREATE TABLE public.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  scan_time timestamptz NOT NULL DEFAULT now(),
  scan_mode text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'present',
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, program_id, date)
);

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view attendance" ON public.attendance_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage attendance" ON public.attendance_logs FOR ALL TO authenticated USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'secretary') OR has_role(auth.uid(), 'department_leader')
);

-- Enable realtime for attendance
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;

-- Add updated_at triggers
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
