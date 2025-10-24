export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: "user" | "admin"
          created_at: string
          updated_at: string
          first_name: string | null
          last_name: string | null
          date_of_birth: string | null
          nationality: string | null
          phone: string | null
          address: string | null
          city: string | null
          postal_code: string | null
          country: string | null
          current_position: string | null
          professional_summary: string | null
          linkedin_url: string | null
          portfolio_url: string | null
          github_url: string | null
          website_url: string | null
          profile_photo_url: string | null
          preferred_language: string
          last_login_at: string | null
        }
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>
      }
      user_cvs: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          cv_name: string
          cv_description: string | null
          cv_structure: Json
          is_default: boolean
          is_public: boolean
          public_url_slug: string | null
          version: number
          created_at: string
          updated_at: string
          last_exported_at: string | null
        }
        Insert: Omit<Database["public"]["Tables"]["user_cvs"]["Row"], "id" | "created_at" | "updated_at" | "version">
        Update: Partial<Database["public"]["Tables"]["user_cvs"]["Insert"]>
      }
      cv_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          thumbnail_url: string | null
          preview_url: string | null
          template_structure: Json
          template_type: "modern" | "classic" | "creative" | "minimal" | "professional" | null
          is_premium: boolean
          is_active: boolean
          usage_count: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database["public"]["Tables"]["cv_templates"]["Row"],
          "id" | "created_at" | "updated_at" | "usage_count"
        >
        Update: Partial<Database["public"]["Tables"]["cv_templates"]["Insert"]>
      }
      user_education: {
        Row: {
          id: string
          user_id: string
          institution: string
          degree: string
          field_of_study: string | null
          start_date: string | null
          end_date: string | null
          is_current: boolean
          description: string | null
          location: string | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["user_education"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["user_education"]["Insert"]>
      }
      user_experience: {
        Row: {
          id: string
          user_id: string
          company: string
          position: string
          start_date: string | null
          end_date: string | null
          is_current: boolean
          description: string | null
          location: string | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["user_experience"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["user_experience"]["Insert"]>
      }
      user_skills: {
        Row: {
          id: string
          user_id: string
          skill_name: string
          skill_level: "beginner" | "intermediate" | "advanced" | "expert" | null
          category: string | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["user_skills"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["user_skills"]["Insert"]>
      }
      media_library: {
        Row: {
          id: string
          file_name: string
          file_type: "image" | "logo" | "icon" | "photo"
          file_url: string
          file_size: number | null
          mime_type: string | null
          alt_text: string | null
          description: string | null
          tags: string[] | null
          storage_bucket: string
          storage_path: string
          category: string | null
          is_public: boolean
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["media_library"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["media_library"]["Insert"]>
      }
      ai_assistant_configs: {
        Row: {
          id: string
          field_name: string
          field_label: string
          enable_generate: boolean
          enable_improve: boolean
          enable_rephrase: boolean
          enable_autofill: boolean
          enable_translate: boolean
          enable_keywords: boolean
          default_model: string
          temperature: number
          max_tokens: number
          generate_prompt: string | null
          improve_prompt: string | null
          rephrase_prompt: string | null
          autofill_prompt: string | null
          keywords_prompt: string | null
          field_context: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["ai_assistant_configs"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["ai_assistant_configs"]["Insert"]>
      }
    }
  }
}
