// Shared Supabase client — both passenger and TTE pages use the same connection.
// Credentials come from frontend/.env (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
export { supabase, getCurrentUser, isAuthenticated } from '../../supabaseClient';
export { default } from '../../supabaseClient';

