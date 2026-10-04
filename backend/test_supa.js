require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

console.log('Testing Supabase Cloud Connection...');
console.log('Project URL:', url);
console.log('Key Present:', Boolean(key));

const supabase = createClient(url, key);

async function testSupabase() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Supabase Error:', error.message, error.code, error.details);
  } else {
    console.log('✅ Connected! Total Users in Supabase:', data.length);
    console.log('User Records:', data);
  }

  // Insert a test user
  console.log('Attempting Insert Test...');
  const testUser = {
    name: 'Supabase Test User',
    username: 'supatester_' + Math.floor(Math.random() * 1000),
    email: 'supatester_' + Math.floor(Math.random() * 1000) + '@gmail.com',
    password_hash: '1234',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=supatester',
    cri_score: 750,
    is_online: true
  };

  const { data: insData, error: insError } = await supabase.from('users').insert([testUser]).select();
  if (insError) {
    console.error('❌ Insert Error:', insError.message, insError.code, insError.details);
  } else {
    console.log('🎉 INSERT SUCCESSFUL! Saved to Supabase Cloud:', insData);
  }
}

testSupabase();
