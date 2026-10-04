require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'wmirdtjpacbdouuixyrg';
const SUPABASE_URL = process.env.SUPABASE_URL || `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

let supabase = null;

if (SUPABASE_KEY && !SUPABASE_KEY.includes('placeholder')) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });
    console.log(`⚡ Blazing-Fast Supabase HTTPS REST Client active for project: ${SUPABASE_PROJECT_ID}`);
  } catch (err) {
    console.error('Supabase Client initialization error:', err.message);
  }
} else {
  console.log('⚠️ SUPABASE_KEY is missing in backend/.env');
}

module.exports = {
  supabase,
  SUPABASE_URL,
  SUPABASE_PROJECT_ID,
  SUPABASE_KEY
};
