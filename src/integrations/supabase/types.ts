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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      price_items: {
        Row: {
          categoria: string | null
          codigo: string
          contratada: string | null
          contrato: string | null
          created_at: string | null
          descricao: string
          fonte: string | null
          id: string
          preco_unitario: number
          sheet_id: string | null
          unidade: string
        }
        Insert: {
          categoria?: string | null
          codigo: string
          contratada?: string | null
          contrato?: string | null
          created_at?: string | null
          descricao: string
          fonte?: string | null
          id?: string
          preco_unitario?: number
          sheet_id?: string | null
          unidade?: string
        }
        Update: {
          categoria?: string | null
          codigo?: string
          contratada?: string | null
          contrato?: string | null
          created_at?: string | null
          descricao?: string
          fonte?: string | null
          id?: string
          preco_unitario?: number
          sheet_id?: string | null
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_items_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "price_sheet_files"
            referencedColumns: ["id"]
          },
        ]
      }
      price_sheet_files: {
        Row: {
          contratada: string
          contrato: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          items_count: number | null
          uploaded_at: string | null
        }
        Insert: {
          contratada: string
          contrato?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          items_count?: number | null
          uploaded_at?: string | null
        }
        Update: {
          contratada?: string
          contrato?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          items_count?: number | null
          uploaded_at?: string | null
        }
        Relationships: []
      }
      service_entries: {
        Row: {
          activity_id: string
          codigo: string
          contratada: string | null
          created_at: string | null
          data: string
          descricao: string
          estaca_final: string | null
          estaca_inicial: string | null
          faixa: string | null
          fiscal: string | null
          id: string
          km_final: string | null
          km_inicial: string | null
          lado: string | null
          localizacao: string | null
          obra: string | null
          observacoes: string | null
          preco_unitario: number
          price_item_id: string | null
          quantidade: number
          segmento: string | null
          trecho: string | null
          unidade: string
          valor_total: number
        }
        Insert: {
          activity_id: string
          codigo: string
          contratada?: string | null
          created_at?: string | null
          data: string
          descricao: string
          estaca_final?: string | null
          estaca_inicial?: string | null
          faixa?: string | null
          fiscal?: string | null
          id?: string
          km_final?: string | null
          km_inicial?: string | null
          lado?: string | null
          localizacao?: string | null
          obra?: string | null
          observacoes?: string | null
          preco_unitario?: number
          price_item_id?: string | null
          quantidade?: number
          segmento?: string | null
          trecho?: string | null
          unidade?: string
          valor_total?: number
        }
        Update: {
          activity_id?: string
          codigo?: string
          contratada?: string | null
          created_at?: string | null
          data?: string
          descricao?: string
          estaca_final?: string | null
          estaca_inicial?: string | null
          faixa?: string | null
          fiscal?: string | null
          id?: string
          km_final?: string | null
          km_inicial?: string | null
          lado?: string | null
          localizacao?: string | null
          obra?: string | null
          observacoes?: string | null
          preco_unitario?: number
          price_item_id?: string | null
          quantidade?: number
          segmento?: string | null
          trecho?: string | null
          unidade?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_entries_price_item_id_fkey"
            columns: ["price_item_id"]
            isOneToOne: false
            referencedRelation: "price_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
