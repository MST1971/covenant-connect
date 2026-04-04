import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Define what each role can access
const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  super_admin: [
    "dashboard", "members", "members.register", "members.edit", "members.delete",
    "departments", "departments.manage", "programs", "programs.manage",
    "attendance.scan", "attendance.reports", "reports", "settings",
    "roles.manage", "giving", "messages", "visitors"
  ],
  pastor: [
    "dashboard", "members", "members.register", "members.edit",
    "departments", "departments.manage", "programs", "programs.manage",
    "attendance.scan", "attendance.reports", "reports",
    "giving", "messages", "visitors"
  ],
  secretary: [
    "dashboard", "members", "members.register", "members.edit",
    "departments", "programs", "programs.manage",
    "attendance.scan", "attendance.reports", "reports",
    "messages", "visitors"
  ],
  department_leader: [
    "dashboard", "members",
    "departments", "attendance.scan", "attendance.reports"
  ],
  finance_officer: [
    "dashboard", "members", "giving", "reports"
  ],
  member: [
    "dashboard.personal", "profile.view", "profile.edit",
    "attendance.personal", "programs.view", "departments.view", "family.manage"
  ],
};

// Roles that get the admin dashboard vs member dashboard
const ADMIN_ROLES: AppRole[] = ["super_admin", "pastor", "secretary", "department_leader", "finance_officer"];

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["user_roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []).map((r) => r.role as AppRole);
    },
    enabled: !!user,
  });

  const highestRole = roles?.[0] || "member";
  const isAdmin = roles?.some((r) => ADMIN_ROLES.includes(r)) ?? false;

  const hasPermission = (permission: string): boolean => {
    if (!roles || roles.length === 0) return false;
    return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
  };

  const hasRole = (role: AppRole): boolean => {
    return roles?.includes(role) ?? false;
  };

  return {
    roles: roles || [],
    highestRole,
    isAdmin,
    isLoading,
    hasPermission,
    hasRole,
    isSuperAdmin: hasRole("super_admin"),
  };
};
