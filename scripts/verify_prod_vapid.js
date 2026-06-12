// Verifica que produccion (rivalfit.app) sirve la MISMA clave VAPID publica
// que tienes en .env.local. La clave publica NO es secreta (va al navegador).
require('dotenv').config({ path: '.env.local' });
const https = require('https');

const PROD = process.env.PROD_URL || 'https://rivalfit.app';
const localPub = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim();

function get(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'user-agent': 'vapid-check' } }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        }).on('error', reject);
    });
}

(async () => {
    if (!localPub) { console.log('No hay clave publica local en .env.local'); return; }
    console.log('Clave publica local: ...' + localPub.slice(-8) + ' (' + localPub.length + ' chars)');

    const home = await get(PROD);
    console.log('rivalfit.app -> HTTP ' + home.status);
    if (home.status !== 200) { console.log('La home no responde 200; revisa el deploy.'); return; }

    // 1) ¿esta la clave directamente en el HTML?
    if (home.body.includes(localPub)) { console.log('RESULTADO: la clave NUEVA esta en produccion (en el HTML) ✓'); return; }

    // 2) buscar en los chunks JS de _next/static
    const srcs = [...home.body.matchAll(/src="([^"]*\/_next\/static\/[^"]+\.js)"/g)].map(m => m[1]);
    const urls = [...new Set(srcs)].map(s => s.startsWith('http') ? s : PROD + s);
    console.log('Revisando ' + urls.length + ' chunks JS...');
    let found = false;
    for (const u of urls) {
        try {
            const r = await get(u);
            if (r.body.includes(localPub)) { found = true; console.log('  encontrada en ' + u.split('/').pop()); break; }
        } catch (e) {}
    }
    console.log(found
        ? 'RESULTADO: produccion sirve la MISMA clave que tu .env.local ✓ (deploy OK)'
        : 'RESULTADO: NO encontre la clave en los chunks iniciales. Puede estar en un chunk cargado bajo demanda (al pedir permiso de notificaciones); no es concluyente.');
})();
