// Script de diagnóstico: Verificar si hay WODs en la base de datos

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ralskslspvskjqqgzbiv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbHNrc2xzcHZza2pxcWd6Yml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMzI3MjgsImV4cCI6MjA4NDYwODcyOH0.FMY5t6X93B2HwZjvHKFMZE8tX7CBZMpRXqB1TwVmqLM'
);

async function checkWODPosts() {
  console.log('🔍 Buscando posts de tipo WOD...\n');

  // Obtener todos los posts recientes
  const { data: allPosts, error: allError } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (allError) {
    console.error('❌ Error al obtener posts:', allError);
    return;
  }

  console.log(`📊 Total de posts encontrados (últimos 5): ${allPosts.length}\n`);

  // Verificar si hay columna post_type
  if (allPosts.length > 0) {
    const firstPost = allPosts[0];
    console.log('📋 Columnas disponibles:', Object.keys(firstPost).join(', '));
    console.log();
  }

  // Buscar específicamente WODs
  const { data: wodPosts, error: wodError } = await supabase
    .from('posts')
    .select('*')
    .eq('post_type', 'wod');

  if (wodError) {
    console.error('❌ Error al buscar WODs:', wodError.message);
    console.log('\n💡 Posible causa: La columna post_type no existe');
    console.log('   Ejecuta el SQL migration en Supabase Dashboard');
    return;
  }

  console.log(`✅ Posts de tipo WOD encontrados: ${wodPosts.length}\n`);

  if (wodPosts.length > 0) {
    wodPosts.forEach((post, i) => {
      console.log(`🏋️ WOD #${i + 1}:`);
      console.log(`   ID: ${post.id}`);
      console.log(`   Usuario: ${post.user_id}`);
      console.log(`   Caption: ${post.caption?.substring(0, 50)}...`);
      console.log(`   Tiene WOD data: ${post.wod_data ? 'Sí' : 'No'}`);
      console.log(`   Creado: ${post.created_at}`);
      console.log();
    });
  } else {
    console.log('⚠️ No se encontraron WODs. Posibles causas:');
    console.log('   1. El WOD no se guardó correctamente');
    console.log('   2. Hay un error en la API de publicación');
    console.log('   3. El usuario no está autenticado');
  }

  // Ver posts recientes normales
  console.log('\n📝 Últimos 3 posts (cualquier tipo):');
  allPosts.slice(0, 3).forEach((post, i) => {
    console.log(`   ${i + 1}. ${post.post_type || 'sin tipo'} - ${post.caption?.substring(0, 40) || 'sin caption'}...`);
  });
}

checkWODPosts().then(() => {
  console.log('\n✅ Diagnóstico completado');
  process.exit(0);
});
