// Extrae la cadena EXACTA de la clave VAPID publica que sirve produccion
// (desde el bundle del dashboard) y la compara con la correcta.
require('dotenv').config({ path: '.env.local' });
const puppeteer = require('puppeteer');
const PROD = process.env.PROD_URL || 'https://rivalfit.app';
const CORRECT = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim();

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const bodies = [];
    page.on('response', async res => {
        if (res.url().includes('/_next/static/') && res.url().endsWith('.js')) {
            try { bodies.push(await res.text()); } catch (e) {}
        }
    });

    await page.goto(PROD + '/login', { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 1200));
    await page.type('input[type="email"]', process.env.QA_EMAIL, { delay: 15 });
    await page.type('input[type="password"]', process.env.QA_PASSWORD, { delay: 15 });
    await Promise.all([page.keyboard.press('Enter'), page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {})]);
    await new Promise(r => setTimeout(r, 6000));

    // buscar cadenas base64url largas que empiecen por B (claves VAPID, validas o no)
    const re = /[A-Za-z0-9_-]{80,95}/g;
    const found = new Set();
    for (const b of bodies) {
        for (const m of (b.match(re) || [])) {
            if (m[0] === 'B') {
                try { const bytes = Buffer.from(m, 'base64url').length; if (bytes >= 60 && bytes <= 70) found.add(m + '|' + bytes); } catch (e) {}
            }
        }
    }
    console.log('CORRECTA  (.env.local): ' + CORRECT.length + ' chars, ...' + CORRECT.slice(-12));
    console.log('');
    if (found.size === 0) {
        console.log('No encontre la clave en el bundle del dashboard (puede estar en un chunk no cargado).');
    } else {
        console.log('Claves VAPID encontradas en el BUNDLE de produccion:');
        for (const f of found) {
            const [k, bytes] = f.split('|');
            const match = k === CORRECT;
            console.log('  ' + bytes + ' bytes, ' + k.length + ' chars, ...' + k.slice(-12) + (match ? '  <-- COINCIDE CON LA CORRECTA' : '  <-- DISTINTA'));
            if (!match && k.startsWith(CORRECT)) console.log('      (es la correcta + "' + k.slice(CORRECT.length) + '" extra al final)');
            if (!match && CORRECT.startsWith(k)) console.log('      (le faltan caracteres del final)');
        }
    }
    await browser.close();
})();
