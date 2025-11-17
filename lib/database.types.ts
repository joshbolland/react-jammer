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
          is_online: boolean | null
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
          is_online?: boolean | null
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
          is_online?: boolean | null
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
          cover_image_url: string | null
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
          cover_image_url?: string | null
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
          cover_image_url?: string | null
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
        Relationships: [
          {
            foreignKeyName: 'jams_host_id_fkey',
            columns: ['host_id'],
            isOneToOne: false,
            referencedRelation: 'profiles',
            referencedColumns: ['id'],
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'jam_members_jam_id_fkey',
            columns: ['jam_id'],
            isOneToOne: false,
            referencedRelation: 'jams',
            referencedColumns: ['id'],
          },
          {
            foreignKeyName: 'jam_members_user_id_fkey',
            columns: ['user_id'],
            isOneToOne: false,
            referencedRelation: 'profiles',
            referencedColumns: ['id'],
          },
        ]
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
      connections: {
        Row: {
          id: string
          requester_id: string
          receiver_id: string
          status: 'pending' | 'connected'
          context_jam_id: string | null
          created_at: string
          updated_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          requester_id: string
          receiver_id: string
          status?: 'pending' | 'connected'
          context_jam_id?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          requester_id?: string
          receiver_id?: string
          status?: 'pending' | 'connected'
          context_jam_id?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
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
      search_jams_within_radius: {
        Args: {
          p_lat: number
          p_lng: number
          p_radius_km: number
          p_instruments?: string[] | null
          p_search?: string | null
          p_date_from?: string | null
          p_date_to?: string | null
          p_limit?: number
        }
        Returns: {
          id: string
          host_id: string
          title: string
          description: string | null
          cover_image_url: string | null
          jam_time: string
          city: string | null
          country: string | null
          lat: number | null
          lng: number | null
          desired_instruments: string[]
          max_attendees: number
          created_at: string
          updated_at: string
          host: Json
          distance_km: number
        }[]
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
