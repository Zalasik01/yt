import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// Cliente com service_role: usado apenas no servidor (API + workers).
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
