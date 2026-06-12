// Verificacion a fondo: carga rivalfit.app en navegador real, captura TODO el
// JS (incluidos chunks prefetch) y busca la clave VAPID publica de tu .env.local.
require('dotenv').config({ path: '.env.local' });
const puppeteer = require('puppeteer');

const PROD = process.env.PROD_URL || 'https://rivalfit.app';
const localPub = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim();

(async () => {
    console.log('Clave local: ...' + localPub.slice(-8));
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const jsBodies = [];
    page.on('response', async (res) => {
        const url = res.url();
        if (url.endsWith('.js') || url.includes('/_next/static/')) {
            try { jsBodies.push(await res.text()); } catch (e) {}
        }
    });

    await page.goto(PROD, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2500));

    // Si hay credenciales, entrar al dashboard (ahi corre el manager de push)
    if (process.env.QA_EMAIL && process.env.QA_PASSWORD) {
        try {
            await page.goto(PROD + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise(r => setTimeout(r, 1500));
            await page.type('input[type="email"]', process.env.QA_EMAIL, { delay: 15 });
            await page.type('input[type="password"]', process.env.QA_PASSWORD, { delay: 15 });
            await Promise.all([page.keyboard.press('Enter'), page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 40000 }).catch(() => {})]);
            await new Promise(r => setTimeout(r, 4000));
            console.log('login produccion -> ' + (page.url().includes('/dashboard') ? 'OK (dashboard)' : 'en ' + page.url()));
        } catch (e) { console.log('login fallo: ' + e.message); }
    }

    const found = jsBodies.some(b => b.includes(localPub));
    const hasManager = jsBodies.some(b => b.includes('applicationServerKey'));
    console.log('Chunks JS capturados: ' + jsBodies.length);
    console.log('Chunk con logica de push (applicationServerKey): ' + (hasManager ? 'si' : 'no visto aun'));

    // Extraer claves estilo VAPID (base64url de ~87 chars) de los chunks con push
    const keyRe = /[A-Za-z0-9_-]{86,88}/g;
    const candidates = new Set();
    for (const b of jsBodies) {
        if (!b.includes('applicationServerKey') && !b.includes('VAPID')) continue;
        for (const m of (b.match(keyRe) || [])) {
            // clave VAPID publica: empieza por 'B' y decodifica a 65 bytes
            try { if (m.startsWith('B') && Buffer.from(m, 'base64url').length === 65) candidates.add(m); } catch (e) {}
        }
    }
    console.log('\\nClave local  termina en: ...' + localPub.slice(-10));
    if (candidates.size === 0) {
        console.log('No pude extraer la clave publica del bundle de produccion (inconcluso).');
    } else {
        [...candidates].forEach(k => console.log('Clave en PROD termina en: ...' + k.slice(-10) + (k === localPub ? '  <-- COINCIDE ✓' : '  <-- DISTINTA')));
    }
    console.log(found
        ? '\\nRESULTADO: produccion sirve TU misma clave ✓'
        : '\\nRESULTADO: la clave de PROD NO coincide con tu .env.local (ver arriba).');
    await browser.close();
})();
