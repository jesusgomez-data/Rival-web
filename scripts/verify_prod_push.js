// Prueba REAL de push en produccion: concede permiso de notificaciones,
// entra al dashboard y comprueba si pushManager.subscribe() tiene exito.
// Distingue: clave ausente | clave invalida | suscripcion OK.
const puppeteer = require('puppeteer');
const PROD = process.env.PROD_URL || 'https://rivalfit.app';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const ctx = browser.defaultBrowserContext();
    await ctx.overridePermissions(PROD, ['notifications']);

    const page = await browser.newPage();
    const signals = [];
    page.on('console', m => {
        const t = m.text();
        if (t.includes('VAPID public key is missing')) signals.push('KEY_MISSING');
        if (t.includes('Error subscribing to push')) signals.push('SUBSCRIBE_ERROR: ' + t.slice(0, 120));
        if (t.includes('Push registration failed')) signals.push('REG_FAILED: ' + t.slice(0, 120));
    });

    // login
    await page.goto(PROD + '/login', { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 1500));
    await page.type('input[type="email"]', process.env.QA_EMAIL, { delay: 15 });
    await page.type('input[type="password"]', process.env.QA_PASSWORD, { delay: 15 });
    await Promise.all([page.keyboard.press('Enter'), page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {})]);
    await new Promise(r => setTimeout(r, 6000)); // dar tiempo al SW + registerPush

    const result = await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return { sw: false };
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        if (!reg) return { sw: 'no-ready' };
        const sub = await reg.pushManager.getSubscription().catch(() => null);
        return {
            sw: true,
            permission: Notification.permission,
            subscribed: !!sub,
            endpointHost: sub ? new URL(sub.endpoint).host : null,
        };
    });

    console.log('URL final:', page.url());
    console.log('Service worker listo:', result.sw);
    console.log('Permiso notificaciones:', result.permission);
    console.log('Suscrito a push:', result.subscribed, result.endpointHost ? '(' + result.endpointHost + ')' : '');
    console.log('Senales:', signals.length ? signals.join(' | ') : 'ninguna');
    console.log('\\n>>> VEREDICTO:');
    if (signals.includes('KEY_MISSING'))
        console.log('  La clave VAPID PUBLICA esta VACIA en el build de produccion. El env var no estaba al COMPILAR. Re-deploy tras guardar la variable.');
    else if (signals.some(s => s.startsWith('SUBSCRIBE_ERROR')))
        console.log('  La clave existe pero el navegador la RECHAZA (invalida/mal formada). Revisa que pegaste la PUBLICA completa.');
    else if (result.subscribed)
        console.log('  PUSH FUNCIONA EN PRODUCCION ✓ — la suscripcion se creo con la clave del build.');
    else
        console.log('  Sin suscripcion y sin error claro (puede tardar o requerir abrir como app). Inconcluso.');

    await browser.close();
})();
