export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          instruments: string[]
          genres: string[]
          experience_level: string | null
          bio: string | null
          availability: string | null
          city: string | null
          country: string | null
          lat: number | null
          lng: number | null
          links: Json
          avatar_url: string | null
          last_active_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          instruments?: string[]
          genres?: string[]
          experience_level?: string | null
          bio?: string | null
          availability?: string | null
          city?: string | null
          country?: string | null
          lat?: number | null
          lng?: number | null
          links?: Json
          avatar_url?: string | null
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          instruments?: string[]
          genres?: string[]
          experience_level?: string | null
          bio?: string | null
          availability?: string | null
          city?: string | null
          country?: string | null
          lat?: number | null
          lng?: number | null
          links?: Json
          avatar_url?: string | null
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      jams: {
        Row: {
          id: string
          host_id: string
          title: string
          description: string | null
          jam_time: string
          city: string | null
          country: string | null
          lat: number | null
          lng: number | null
          desired_instruments: string[]
          max_attendees: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          host_id: string
          title: string
          description?: string | null
          jam_time: string
          city?: string | null
          country?: string | null
          lat?: number | null
          lng?: number | null
          desired_instruments?: string[]
          max_attendees?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          host_id?: string
          title?: string
          description?: string | null
          jam_time?: string
          city?: string | null
          country?: string | null
          lat?: number | null
          lng?: number | null
          desired_instruments?: string[]
          max_attendees?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      jam_members: {
        Row: {
          jam_id: string
          user_id: string
          role: string
          status: string
          joined_at: string
        }
        Insert: {
          jam_id: string
          user_id: string
          role?: string
          status?: string
          joined_at?: string
        }
        Update: {
          jam_id?: string
          user_id?: string
          role?: string
          status?: string
          joined_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          room_type: string
          room_id: string
          sender_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          room_type: string
          room_id: string
          sender_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          room_type?: string
          room_id?: string
          sender_id?: string
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      dms: {
        Row: {
          id: string
          user_a: string
          user_b: string
          created_at: string
          user_a_last_read_at: string | null
          user_b_last_read_at: string | null
        }
        Insert: {
          id?: string
          user_a: string
          user_b: string
          created_at?: string
          user_a_last_read_at?: string | null
          user_b_last_read_at?: string | null
        }
        Update: {
          id?: string
          user_a?: string
          user_b?: string
          created_at?: string
          user_a_last_read_at?: string | null
          user_b_last_read_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      mark_dm_read: {
        Args: {
          p_dm_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
