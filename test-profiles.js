import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const email = `test-${Date.now()}@example.com`;
  const password = 'Password123!';
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (authError) return;
  const userId = authData.user.id;
  const { data: profileData, error } = await supabase.from('client_profiles').insert([{ user_id: userId, profile_name: 'Test Profile' }]).select().single();
  console.log('profileData:', profileData, error);
}

test();
