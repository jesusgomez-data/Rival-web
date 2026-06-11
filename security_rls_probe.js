// Sonda de seguridad RLS: simula un atacante anónimo con la clave pública.
// Si alguna tabla sensible devuelve filas, hay un agujero de RLS.
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const probes = [
    // [tabla, columnas sensibles]
    ['members', 'email, phone, full_name'],
    ['profiles', 'id, phone'],
    ['organizations', 'id, name, email'],
    ['org_members', 'user_id, role'],
    ['subscription_logs', 'event_type'],
    ['messages', 'content'],
    ['chats', 'id'],
    ['notifications', 'id'],
    ['sales', 'amount'],
    ['push_subscriptions', 'endpoint'],
    ['ai_daily_usage', 'user_id'],
    ['site_visits', 'page_path'],
];

(async () => {
    for (const [table, cols] of probes) {
        try {
            const { data, error } = await anon.from(table).select(cols).limit(3);
            if (error) {
                console.log(`OK    ${table}: bloqueado (${error.code || error.message.slice(0, 50)})`);
            } else if (!data || data.length === 0) {
                console.log(`OK    ${table}: 0 filas visibles`);
            } else {
                console.log(`LEAK  ${table}: ${data.length} filas LEGIBLES SIN AUTH -> ${JSON.stringify(data[0]).slice(0, 120)}`);
            }
        } catch (e) {
            console.log(`OK    ${table}: ${e.message.slice(0, 60)}`);
        }
    }
})();
