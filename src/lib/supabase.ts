import { createClient } from '@supabase/supabase-js';
import { supabaseEnv } from './env';

export const supabase = supabaseEnv.isConfigured
  ? createClient(supabaseEnv.url, supabaseEnv.publishableKey)
  : null;
