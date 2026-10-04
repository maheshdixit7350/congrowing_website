// Pure Supabase Cloud Database Client (No Local MySQL)
const { supabase, SUPABASE_PROJECT_ID, SUPABASE_URL } = require('./supabase');

async function initDB() {
  console.log('=======================================================');
  console.log(`  PRIMARY DATABASE: Cloud Supabase PostgreSQL`);
  console.log(`  Project ID: ${SUPABASE_PROJECT_ID}`);
  console.log(`  Project URL: ${SUPABASE_URL}`);
  console.log('=======================================================');
}

module.exports = {
  initDB,
  supabase,
  SUPABASE_PROJECT_ID,
  SUPABASE_URL
};
