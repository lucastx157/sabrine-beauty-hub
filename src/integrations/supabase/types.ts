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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      availability: {
        Row: {
          active: boolean | null
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          slot_interval_minutes: number
          start_time: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          slot_interval_minutes?: number
          start_time: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          slot_interval_minutes?: number
          start_time?: string
        }
        Relationships: []
      }
      availability_overrides: {
        Row: {
          active: boolean | null
          available_date: string
          created_at: string | null
          id: string
          is_blocked: boolean
          start_time: string
        }
        Insert: {
          active?: boolean | null
          available_date: string
          created_at?: string | null
          id?: string
          is_blocked?: boolean
          start_time: string
        }
        Update: {
          active?: boolean | null
          available_date?: string
          created_at?: string | null
          id?: string
          is_blocked?: boolean
          start_time?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          amount_cents: number | null
          attendee_name: string | null
          booking_date: string
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string | null
          end_time: string
          id: string
          notes: string | null
          original_booking_id: string | null
          payment_proof_path: string | null
          service_id: string | null
          start_time: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount_cents?: number | null
          attendee_name?: string | null
          booking_date: string
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string | null
          end_time: string
          id?: string
          notes?: string | null
          original_booking_id?: string | null
          payment_proof_path?: string | null
          service_id?: string | null
          start_time: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number | null
          attendee_name?: string | null
          booking_date?: string
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          original_booking_id?: string | null
          payment_proof_path?: string | null
          service_id?: string | null
          start_time?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_original_booking_id_fkey"
            columns: ["original_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          deposit_cents: number | null
          description: string | null
          duration_max: number | null
          duration_min: number | null
          id: string
          name: string
          price_max: number | null
          price_min: number | null
          price_note: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          deposit_cents?: number | null
          description?: string | null
          duration_max?: number | null
          duration_min?: number | null
          id?: string
          name: string
          price_max?: number | null
          price_min?: number | null
          price_note?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          deposit_cents?: number | null
          description?: string | null
          duration_max?: number | null
          duration_min?: number | null
          id?: string
          name?: string
          price_max?: number | null
          price_min?: number | null
          price_note?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_outbound_messages: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          message_id: string | null
          payload: Json | null
          recipient: string
          status: string | null
          status_payload: Json | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          payload?: Json | null
          recipient: string
          status?: string | null
          status_payload?: Json | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          payload?: Json | null
          recipient?: string
          status?: string | null
          status_payload?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_outbound_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_events: {
        Row: {
          delivery_id: string | null
          event: string | null
          id: string
          payload: Json | null
          processed_at: string | null
          processing_error: string | null
          received_at: string | null
        }
        Insert: {
          delivery_id?: string | null
          event?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string | null
        }
        Update: {
          delivery_id?: string | null
          event?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string | null
        }
        Relationships: []
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
      is_booking_datetime_after_hours: {
        Args: {
          _booking: Database["public"]["Tables"]["bookings"]["Row"]
          _hours: number
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
