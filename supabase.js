// import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SUPABASE_URL = 'https://quqxkzzddjmtvoswdbjw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cXhrenpkZGptdHZvc3dkYmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMDgxNzQsImV4cCI6MjA4MTc4NDE3NH0.cz6Flu4fkFXdxboowLw6FHnHMnhQ64-191mhr70QmzY';

// Import Supabase from CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);