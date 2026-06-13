const path = require('path');
const projectDir = 'c:\\Users\\jesus\\Documents\\AntiGravity\\Proyecto1\\Rival-web';
const { createClient } = require(path.join(projectDir, 'node_modules', '@supabase', 'supabase-js'));
const dotenv = require(path.join(projectDir, 'node_modules', 'dotenv'));

dotenv.config({ path: path.join(projectDir, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase env variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, user_id, media_type, media_url, caption, created_at')
    .like('caption', '%WOD FINALIZADO%')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${posts.length} posts with WOD FINALIZADO.`);
  posts.forEach((p, idx) => {
    console.log(`\n--- Post ${idx + 1} (${p.id}) ---`);
    console.log(`User: ${p.user_id}`);
    console.log(`Media Type: ${p.media_type}`);
    console.log(`Caption: ${p.caption}`);
    console.log(`Media URL:`, p.media_url);
    try {
      const parsed = JSON.parse(p.media_url);
      console.log(`Parsed items:`, JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log("Not valid JSON");
    }
  });
}

main();
