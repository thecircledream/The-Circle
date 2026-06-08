import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Ако ключовете липсват, приложението пада обратно на seed данните.
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : {
      from() {
        return {
          select: async () => ({ data: null, error: new Error("Supabase not configured") }),
          insert: async () => ({ error: new Error("Supabase not configured") }),
          update: async () => ({ error: new Error("Supabase not configured") }),
          delete: async () => ({ error: new Error("Supabase not configured") }),
          upsert: async () => ({ error: new Error("Supabase not configured") }),
          order() { return this; },
          eq() { return this; },
        };
      },
    };
