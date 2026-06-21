// Apply thumbnail_url migration to Supabase
// Uses Supabase Management API to execute SQL directly

const SQL = `
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
COMMENT ON COLUMN public.posts.thumbnail_url IS 'URL of the auto-generated or user-selected thumbnail for video posts';
UPDATE public.posts SET thumbnail_url = cover_url WHERE cover_url IS NOT NULL AND thumbnail_url IS NULL;
`;

const PROJECT_REF = 'ralskslspvskjqqgzbiv';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.log('Usage: set SUPABASE_ACCESS_TOKEN=<your-token> and run this script');
  console.log('\nAlternatively, run this SQL directly in Supabase Dashboard SQL Editor:');
  console.log('https://supabase.com/dashboard/project/ralskslspvskjqqgzbiv/sql');
  console.log('\n--- SQL TO RUN ---');
  console.log(SQL);
  process.exit(0);
}

fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ACCESS_TOKEN}`
  },
  body: JSON.stringify({ query: SQL })
})
.then(r => r.json())
.then(result => {
  console.log('Migration result:', JSON.stringify(result, null, 2));
})
.catch(err => {
  console.error('Migration failed:', err.message);
});
