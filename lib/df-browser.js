import{createClient}from"@supabase/supabase-js";
export const dfSupabase=createClient("https://svafsvyjjufbqvxzoqee.supabase.co","sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
