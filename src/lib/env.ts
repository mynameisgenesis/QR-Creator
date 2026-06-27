export type SupabaseEnv =
  | {
      isConfigured: true;
      url: string;
      publishableKey: string;
    }
  | {
      isConfigured: false;
      missingKeys: string[];
    };

const requiredEnv = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
};

const missingKeys = Object.entries(requiredEnv)
  .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
  .map(([key]) => key);

export const supabaseEnv: SupabaseEnv =
  missingKeys.length > 0
    ? {
        isConfigured: false,
        missingKeys,
      }
    : {
        isConfigured: true,
        url: requiredEnv.VITE_SUPABASE_URL,
        publishableKey: requiredEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
