// QA headless de flujos publicos: errores de consola, status HTTP, validacion de forms.
const puppeteer = require('puppeteer');
const BASE = 'http://localhost:3000';

const ROUTES = [
    ['/', 'Landing/Login'],
    ['/for-centers', 'Landing B2B centros'],
    ['/center-signup', 'Alta de centro'],
    ['/signup', 'Alta de atleta'],
    ['/login', 'Login'],
    ['/onboarding', 'Onboarding'],
    ['/legal/privacy', 'Privacidad'],
    ['/legal/terms', 'Terminos'],
    ['/legal/support', 'Soporte'],
];

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    let totalErrors = 0;

    for (const [route, label] of ROUTES) {
        const page = await browser.newPage();
        const errors = [];
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 100)); });
        page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message.slice(0, 100)));
        let status = '?';
        try {
            const resp = await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 40000 });
            status = resp ? resp.status() : 'no-resp';
            await new Promise(r => setTimeout(r, 1800));
        } catch (e) {
            errors.push('NAV: ' + e.message.slice(0, 80));
        }
        // filtrar ruido conocido (hydration ya resuelto, favicons, etc. no deberian salir)
        const real = errors.filter(e =>
            !e.includes('favicon') &&
            !e.toLowerCase().includes('download the react devtools')
        );
        totalErrors += real.length;
        const mark = real.length === 0 ? 'OK  ' : 'WARN';
        console.log(`${mark} [${status}] ${label.padEnd(22)} ${route}` + (real.length ? `  -> ${real.length} err: ${real[0]}` : ''));
        await page.close();
    }

    console.log('\\n=== Total errores reales en consola: ' + totalErrors + ' ===');
    await browser.close();
})();
