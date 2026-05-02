export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendance_logs: {
        Row: {
          created_at: string
          date: string
          department_id: string | null
          id: string
          profile_id: string
          program_id: string
          scan_mode: string
          scan_time: string
          status: string
        }
        Insert: {
          created_at?: string
          date?: string
          department_id?: string | null
          id?: string
          profile_id: string
          program_id: string
          scan_mode?: string
          scan_time?: string
          status?: string
        }
        Update: {
          created_at?: string
          date?: string
          department_id?: string | null
          id?: string
          profile_id?: string
          program_id?: string
          scan_mode?: string
          scan_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      department_members: {
        Row: {
          department_id: string
          id: string
          joined_at: string
          profile_id: string
        }
        Insert: {
          department_id: string
          id?: string
          joined_at?: string
          profile_id: string
        }
        Update: {
          department_id?: string
          id?: string
          joined_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          leader_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          leader_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          leader_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          family_head_id: string | null
          family_name: string
          household_address: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_head_id?: string | null
          family_name: string
          household_address?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_head_id?: string | null
          family_name?: string
          household_address?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "families_family_head_id_fkey"
            columns: ["family_head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          family_id: string
          id: string
          profile_id: string
          relationship: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          profile_id: string
          relationship: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          profile_id?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          account_number: string | null
          account_type: Database["public"]["Enums"]["account_type"]
          bank_name: string | null
          created_at: string
          currency: string
          current_balance: number
          id: string
          is_active: boolean
          name: string
          notes: string | null
          opening_balance: number
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          bank_name?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          opening_balance?: number
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          bank_name?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          opening_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      financial_budget_lines: {
        Row: {
          budget_id: string
          category_id: string
          created_at: string
          id: string
          month: number
          notes: string | null
          planned_amount: number
          updated_at: string
        }
        Insert: {
          budget_id: string
          category_id: string
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          planned_amount?: number
          updated_at?: string
        }
        Update: {
          budget_id?: string
          category_id?: string
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          planned_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "financial_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_budget_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_budgets: {
        Row: {
          created_at: string
          created_by: string | null
          fiscal_year: number
          id: string
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["budget_status"]
          total_expense_planned: number
          total_income_planned: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fiscal_year: number
          id?: string
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["budget_status"]
          total_expense_planned?: number
          total_income_planned?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fiscal_year?: number
          id?: string
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["budget_status"]
          total_expense_planned?: number
          total_income_planned?: number
          updated_at?: string
        }
        Relationships: []
      }
      financial_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_system: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_fiscal_years: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          end_date: string
          id: string
          is_closed: boolean
          start_date: string
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          is_closed?: boolean
          start_date: string
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          is_closed?: boolean
          start_date?: string
          year?: number
        }
        Relationships: []
      }
      financial_recurring: {
        Row: {
          account_id: string
          amount: number
          auto_post: boolean
          category_id: string | null
          created_at: string
          day_of_month: number | null
          description: string | null
          end_date: string | null
          frequency: Database["public"]["Enums"]["recurring_freq"]
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["txn_kind"]
          last_run_at: string | null
          name: string
          next_run_date: string
          payee_or_payer: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          auto_post?: boolean
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          description?: string | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurring_freq"]
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["txn_kind"]
          last_run_at?: string | null
          name: string
          next_run_date?: string
          payee_or_payer?: string | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          auto_post?: boolean
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          description?: string | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurring_freq"]
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["txn_kind"]
          last_run_at?: string | null
          name?: string
          next_run_date?: string
          payee_or_payer?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_recurring_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_recurring_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          account_id: string
          amount: number
          approved_by: string | null
          category_id: string | null
          created_at: string
          description: string | null
          giving_record_id: string | null
          id: string
          kind: Database["public"]["Enums"]["txn_kind"]
          payee_or_payer: string | null
          payment_method: string | null
          receipt_url: string | null
          recorded_by: string | null
          reference: string | null
          status: Database["public"]["Enums"]["txn_status"]
          to_account_id: string | null
          txn_date: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          approved_by?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          giving_record_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["txn_kind"]
          payee_or_payer?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          to_account_id?: string | null
          txn_date?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          approved_by?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          giving_record_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["txn_kind"]
          payee_or_payer?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          to_account_id?: string | null
          txn_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_giving_record_id_fkey"
            columns: ["giving_record_id"]
            isOneToOne: false
            referencedRelation: "giving_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      giving_records: {
        Row: {
          amount: number
          created_at: string
          date: string
          giving_type: string
          id: string
          notes: string | null
          payment_method: string | null
          profile_id: string
          recorded_by: string | null
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          giving_type?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          profile_id: string
          recorded_by?: string | null
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          giving_type?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          profile_id?: string
          recorded_by?: string | null
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "giving_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_id_counters: {
        Row: {
          counter_type: string
          id: string
          last_number: number
          updated_at: string
        }
        Insert: {
          counter_type: string
          id?: string
          last_number?: number
          updated_at?: string
        }
        Update: {
          counter_type?: string
          id?: string
          last_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          birth_day: number | null
          birth_month: number | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          education: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          health_notes: string | null
          id: string
          marital_status:
            | Database["public"]["Enums"]["marital_status_type"]
            | null
          marriage_date: string | null
          member_code: string | null
          membership_status:
            | Database["public"]["Enums"]["membership_status"]
            | null
          occupation: string | null
          pastor_notes: string | null
          phone_number: string | null
          photo_url: string | null
          qr_code: string | null
          skills: string | null
          spouse_name: string | null
          state: string | null
          updated_at: string
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          birth_day?: number | null
          birth_month?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          education?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          health_notes?: string | null
          id?: string
          marital_status?:
            | Database["public"]["Enums"]["marital_status_type"]
            | null
          marriage_date?: string | null
          member_code?: string | null
          membership_status?:
            | Database["public"]["Enums"]["membership_status"]
            | null
          occupation?: string | null
          pastor_notes?: string | null
          phone_number?: string | null
          photo_url?: string | null
          qr_code?: string | null
          skills?: string | null
          spouse_name?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          birth_day?: number | null
          birth_month?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          education?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          health_notes?: string | null
          id?: string
          marital_status?:
            | Database["public"]["Enums"]["marital_status_type"]
            | null
          marriage_date?: string | null
          member_code?: string | null
          membership_status?:
            | Database["public"]["Enums"]["membership_status"]
            | null
          occupation?: string | null
          pastor_notes?: string | null
          phone_number?: string | null
          photo_url?: string | null
          qr_code?: string | null
          skills?: string | null
          spouse_name?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          day: string
          end_time: string
          grace_period: string | null
          id: string
          is_active: boolean
          name: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day: string
          end_time: string
          grace_period?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day?: string
          end_time?: string
          grace_period?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      spiritual_info: {
        Row: {
          baptism_date: string | null
          created_at: string
          date_joined: string | null
          department: string | null
          id: string
          ministry_involvement: string | null
          profile_id: string
          salvation_date: string | null
          spiritual_gifts: string | null
          updated_at: string
        }
        Insert: {
          baptism_date?: string | null
          created_at?: string
          date_joined?: string | null
          department?: string | null
          id?: string
          ministry_involvement?: string | null
          profile_id: string
          salvation_date?: string | null
          spiritual_gifts?: string | null
          updated_at?: string
        }
        Update: {
          baptism_date?: string | null
          created_at?: string
          date_joined?: string | null
          department?: string | null
          id?: string
          ministry_involvement?: string | null
          profile_id?: string
          salvation_date?: string | null
          spiritual_gifts?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spiritual_info_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitors: {
        Row: {
          address: string | null
          age_range: string | null
          assigned_to: string | null
          converted_profile_id: string | null
          converted_to_member: boolean
          created_at: string
          email: string | null
          follow_up_date: string | null
          follow_up_notes: string | null
          follow_up_status: string
          full_name: string
          gender: string | null
          id: string
          invited_by_member_id: string | null
          invited_by_name: string | null
          phone_number: string | null
          program_attended: string | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          address?: string | null
          age_range?: string | null
          assigned_to?: string | null
          converted_profile_id?: string | null
          converted_to_member?: boolean
          created_at?: string
          email?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_status?: string
          full_name: string
          gender?: string | null
          id?: string
          invited_by_member_id?: string | null
          invited_by_name?: string | null
          phone_number?: string | null
          program_attended?: string | null
          updated_at?: string
          visit_date?: string
        }
        Update: {
          address?: string | null
          age_range?: string | null
          assigned_to?: string | null
          converted_profile_id?: string | null
          converted_to_member?: boolean
          created_at?: string
          email?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_status?: string
          full_name?: string
          gender?: string | null
          id?: string
          invited_by_member_id?: string | null
          invited_by_name?: string | null
          phone_number?: string | null
          program_attended?: string | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitors_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_converted_profile_id_fkey"
            columns: ["converted_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_invited_by_member_id_fkey"
            columns: ["invited_by_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "cash" | "bank" | "mobile_money" | "other"
      app_role:
        | "super_admin"
        | "pastor"
        | "secretary"
        | "department_leader"
        | "finance_officer"
        | "member"
      budget_status: "draft" | "active" | "closed"
      category_kind: "income" | "expense"
      gender_type: "male" | "female"
      marital_status_type: "single" | "married" | "divorced" | "widowed"
      membership_status: "member" | "visitor" | "worker"
      recurring_freq: "weekly" | "monthly" | "quarterly" | "yearly"
      txn_kind: "income" | "expense" | "transfer"
      txn_status: "pending" | "posted" | "void"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["cash", "bank", "mobile_money", "other"],
      app_role: [
        "super_admin",
        "pastor",
        "secretary",
        "department_leader",
        "finance_officer",
        "member",
      ],
      budget_status: ["draft", "active", "closed"],
      category_kind: ["income", "expense"],
      gender_type: ["male", "female"],
      marital_status_type: ["single", "married", "divorced", "widowed"],
      membership_status: ["member", "visitor", "worker"],
      recurring_freq: ["weekly", "monthly", "quarterly", "yearly"],
      txn_kind: ["income", "expense", "transfer"],
      txn_status: ["pending", "posted", "void"],
    },
  },
} as const
