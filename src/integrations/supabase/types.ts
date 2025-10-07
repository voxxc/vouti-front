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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      client_history: {
        Row: {
          action_type: string
          client_name: string
          created_at: string
          description: string | null
          id: string
          project_id: string
          title: string
          user_id: string
        }
        Insert: {
          action_type: string
          client_name: string
          created_at?: string
          description?: string | null
          id?: string
          project_id: string
          title: string
          user_id: string
        }
        Update: {
          action_type?: string
          client_name?: string
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      controladoria_processos: {
        Row: {
          assunto: string
          cliente: string
          created_at: string
          id: string
          numero_processo: string
          observacoes: string | null
          status: string
          tribunal: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assunto: string
          cliente: string
          created_at?: string
          id?: string
          numero_processo: string
          observacoes?: string | null
          status?: string
          tribunal: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assunto?: string
          cliente?: string
          created_at?: string
          id?: string
          numero_processo?: string
          observacoes?: string | null
          status?: string
          tribunal?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deadlines: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          description: string | null
          id: string
          project_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date: string
          description?: string | null
          id?: string
          project_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadlines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_comments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_captacao"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captacao: {
        Row: {
          comentario: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          origem: string | null
          prioridade: string | null
          responsavel_id: string | null
          status: string | null
          telefone: string | null
          tipo: string | null
          uf: string | null
          updated_at: string
          user_id: string
          validado: string | null
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          origem?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          status?: string | null
          telefone?: string | null
          tipo?: string | null
          uf?: string | null
          updated_at?: string
          user_id: string
          validado?: string | null
        }
        Update: {
          comentario?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          origem?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          status?: string | null
          telefone?: string | null
          tipo?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string
          validado?: string | null
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string | null
          receiver_id: string
          related_project_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string | null
          receiver_id: string
          related_project_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string | null
          receiver_id?: string
          related_project_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      metal_profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          setor: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          setor?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          setor?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      metal_user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["metal_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["metal_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["metal_role"]
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          related_project_id: string | null
          related_task_id: string | null
          title: string
          triggered_by_user_id: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_project_id?: string | null
          related_task_id?: string | null
          title: string
          triggered_by_user_id: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_project_id?: string | null
          related_task_id?: string | null
          title?: string
          triggered_by_user_id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role_type"] | null
          theme_preference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role_type"] | null
          theme_preference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role_type"] | null
          theme_preference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_collaborators: {
        Row: {
          added_at: string
          id: string
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          client: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          client?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          card_color: string | null
          created_at: string
          description: string | null
          id: string
          project_id: string
          status: string
          task_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          card_color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id: string
          status?: string
          task_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          card_color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string
          status?: string
          task_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_automations: {
        Row: {
          created_at: string | null
          id: string
          instance_name: string
          is_active: boolean | null
          response_message: string
          trigger_keyword: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instance_name: string
          is_active?: boolean | null
          response_message: string
          trigger_keyword: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_name?: string
          is_active?: boolean | null
          response_message?: string
          trigger_keyword?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          connection_status: string | null
          created_at: string | null
          id: string
          instance_name: string
          last_update: string | null
          qr_code: string | null
          user_id: string | null
        }
        Insert: {
          connection_status?: string | null
          created_at?: string | null
          id?: string
          instance_name: string
          last_update?: string | null
          qr_code?: string | null
          user_id?: string | null
        }
        Update: {
          connection_status?: string | null
          created_at?: string | null
          id?: string
          instance_name?: string
          last_update?: string | null
          qr_code?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string | null
          direction: string | null
          from_number: string
          id: string
          instance_name: string
          message_id: string
          message_text: string | null
          message_type: string | null
          raw_data: Json | null
          timestamp: string | null
          to_number: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          direction?: string | null
          from_number: string
          id?: string
          instance_name: string
          message_id: string
          message_text?: string | null
          message_type?: string | null
          raw_data?: Json | null
          timestamp?: string | null
          to_number?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string | null
          from_number?: string
          id?: string
          instance_name?: string
          message_id?: string
          message_text?: string | null
          message_type?: string | null
          raw_data?: Json | null
          timestamp?: string | null
          to_number?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_project_notification: {
        Args: {
          notification_content: string
          notification_title: string
          notification_type: string
          project_id_param: string
          task_id_param?: string
          triggered_by?: string
        }
        Returns: undefined
      }
      has_metal_role: {
        Args: {
          _role: Database["public"]["Enums"]["metal_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_project_member: {
        Args: { project_id: string; uid?: string }
        Returns: boolean
      }
      is_project_owner: {
        Args: { project_id: string; uid?: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "advogado" | "comercial" | "financeiro"
      metal_role: "admin" | "operador"
      user_role_type: "admin" | "advogado" | "comercial" | "financeiro"
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
      app_role: ["admin", "advogado", "comercial", "financeiro"],
      metal_role: ["admin", "operador"],
      user_role_type: ["admin", "advogado", "comercial", "financeiro"],
    },
  },
} as const
