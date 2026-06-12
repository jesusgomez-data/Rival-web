// Intercepta PushManager.subscribe en produccion para medir EXACTAMENTE la
// clave que el build esta usando (sin exponer secretos: solo longitud/tail).
const puppeteer = require('puppeteer');
const PROD = process.env.PROD_URL || 'https://rivalfit.app';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const ctx = browser.defaultBrowserContext();
    await ctx.overridePermissions(PROD, ['notifications']);
    const page = await browser.newPage();

    // Patch ANTES de que corra la app: captura el applicationServerKey
    await page.evaluateOnNewDocument(() => {
        try {
            const orig = PushManager.prototype.subscribe;
            PushManager.prototype.subscribe = function (opts) {
                try {
                    const k = opts && opts.applicationServerKey;
                    let len = null, tail = null;
                    if (k instanceof Uint8Array) { len = k.length; }
                    else if (typeof k === 'string') { len = k.length; tail = k.slice(-10); }
                    else if (k && k.byteLength != null) { len = k.byteLength; }
                    window.__capturedKey = { type: (k && k.constructor && k.constructor.name) || typeof k, len, tail };
                } catch (e) { window.__capturedKey = { err: String(e) }; }
                return orig.apply(this, arguments);
            };
        } catch (e) {}
    });

    await page.goto(PROD + '/login', { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 1200));
    await page.type('input[type="email"]', process.env.QA_EMAIL, { delay: 15 });
    await page.type('input[type="password"]', process.env.QA_PASSWORD, { delay: 15 });
    await Promise.all([page.keyboard.press('Enter'), page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {})]);
    await new Promise(r => setTimeout(r, 6000));

    const cap = await page.evaluate(() => window.__capturedKey || null);
    console.log('Clave que usa PRODUCCION en subscribe():');
    if (!cap) console.log('  (no se capturo: el manager no llego a subscribe — quiza ya estaba suscrito o no corrio)');
    else {
        console.log('  tipo: ' + cap.type);
        console.log('  bytes (applicationServerKey): ' + cap.len + '  -> una clave VALIDA debe ser 65 bytes');
        if (cap.len === 65) console.log('  => Es de 65 bytes: la clave PUBLICA tiene el tamano correcto.');
        else if (cap.len === 32) console.log('  => 32 bytes: ESTAS USANDO LA CLAVE PRIVADA en la variable publica (cruzadas).');
        else console.log('  => Tamano inesperado: clave truncada/mal pegada o vacia.');
    }
    // tambien comprobar la build id para ver si re-deployo
    const buildId = await page.evaluate(() => (window.__NEXT_DATA__ && window.__NEXT_DATA__.buildId) || null);
    console.log('Build ID de produccion:', buildId);

    await browser.close();
})();
