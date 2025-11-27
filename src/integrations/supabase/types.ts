export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string | null
          session_id: string
          type: Database["public"]["Enums"]["chat_message_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          session_id: string
          type?: Database["public"]["Enums"]["chat_message_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          session_id?: string
          type?: Database["public"]["Enums"]["chat_message_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          created_at: string
          day_number: number
          evening_review: string | null
          id: string
          log_date: string
          morning_promise: string | null
          talk_room_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_number: number
          evening_review?: string | null
          id?: string
          log_date?: string
          morning_promise?: string | null
          talk_room_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_number?: number
          evening_review?: string | null
          id?: string
          log_date?: string
          morning_promise?: string | null
          talk_room_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          is_public: boolean
          likes_count: number
          talk_room_id: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_public?: boolean
          likes_count?: number
          talk_room_id?: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_public?: boolean
          likes_count?: number
          talk_room_id?: string | null
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          content: string | null
          created_at: string
          id: string
          talk_room_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          talk_room_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          talk_room_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_favorites: {
        Row: {
          created_at: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_favorites_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "talk_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_participants: {
        Row: {
          course_completed: boolean
          id: string
          joined_at: string
          review_completed: boolean
          room_id: string
          status: string
          user_id: string
        }
        Insert: {
          course_completed?: boolean
          id?: string
          joined_at?: string
          review_completed?: boolean
          room_id: string
          status?: string
          user_id: string
        }
        Update: {
          course_completed?: boolean
          id?: string
          joined_at?: string
          review_completed?: boolean
          room_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "talk_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      talk_rooms: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          host_id: string
          id: string
          is_public: boolean
          keywords: string[]
          media_type: string | null
          media_url: string | null
          price_cents: number
          price_currency: string
          replay_available: boolean
          starts_at: string
          title: string
          training_weeks: number
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          description?: string | null
          host_id: string
          id?: string
          is_public?: boolean
          keywords?: string[]
          media_type?: string | null
          media_url?: string | null
          price_cents?: number
          price_currency?: string
          replay_available?: boolean
          starts_at: string
          title: string
          training_weeks?: number
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          host_id?: string
          id?: string
          is_public?: boolean
          keywords?: string[]
          media_type?: string | null
          media_url?: string | null
          price_cents?: number
          price_currency?: string
          replay_available?: boolean
          starts_at?: string
          title?: string
          training_weeks?: number
          updated_at?: string
        }
        Relationships: []
      }
      training_courses: {
        Row: {
          course_data: Json
          created_at: string
          id: string
          start_date: string
          talk_room_id: string
          total_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          course_data?: Json
          created_at?: string
          id?: string
          start_date?: string
          talk_room_id: string
          total_days: number
          updated_at?: string
          user_id: string
        }
        Update: {
          course_data?: Json
          created_at?: string
          id?: string
          start_date?: string
          talk_room_id?: string
          total_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          level: number
          name: string | null
          rating: number
          streak_days: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id: string
          level?: number
          name?: string | null
          rating?: number
          streak_days?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          level?: number
          name?: string | null
          rating?: number
          streak_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      voice_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          host_id: string
          id: string
          is_active: boolean
          participants_count: number
          queue: string[]
          speakers: string[]
          started_at: string
          talk_room_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          host_id: string
          id?: string
          is_active?: boolean
          participants_count?: number
          queue?: string[]
          speakers?: string[]
          started_at?: string
          talk_room_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          host_id?: string
          id?: string
          is_active?: boolean
          participants_count?: number
          queue?: string[]
          speakers?: string[]
          started_at?: string
          talk_room_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_evening_logs: {
        Args: { _room_id: string }
        Returns: {
          user_id: string
          day_number: number
          evening_review: string
          log_date: string
          created_at: string
        }[]
      }
      get_public_user_profile: {
        Args: { _id: string }
        Returns: {
          id: string
          name: string
          rating: number
          bio: string
        }[]
      }
      insert_notification: {
        Args: {
          _user_id: string
          _type: Database["public"]["Enums"]["notification_type"]
          _title: string
          _message: string
        }
        Returns: undefined
      }
      is_current_user_host_of: {
        Args: { _room_id: string }
        Returns: boolean
      }
      is_current_user_participant: {
        Args: { _room_id: string }
        Returns: boolean
      }
      seed_full_samples: {
        Args: { _host_id: string }
        Returns: undefined
      }
    }
    Enums: {
      chat_message_type: "text" | "cheer" | "system"
      notification_type: "nudge" | "chat" | "system"
      post_type: "review" | "daily_promise" | "training_complete"
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
      chat_message_type: ["text", "cheer", "system"],
      notification_type: ["nudge", "chat", "system"],
      post_type: ["review", "daily_promise", "training_complete"],
    },
  },
} as const
