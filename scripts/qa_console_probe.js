// Sonda de errores de consola en el dashboard autenticado (tras fixes).
const puppeteer = require('puppeteer');
const BASE = 'http://localhost:3000';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 430, height: 920 });
    await page.evaluateOnNewDocument(() => {
        try {
            localStorage.setItem('rival_theme', 'dark');
            localStorage.setItem('rival_tour_completed', 'true');
        } catch (e) {}
    });

    const errs = [];
    const nestedFull = [];
    page.on('console', async m => {
        if (m.type() !== 'error') return;
        const t = m.text();
        errs.push(t.replace(/\s+/g, ' ').slice(0, 120));
        if (t.includes('descendant of') || t.includes('cannot contain a nested')) {
            // resolver todos los args (incluye el stack de componentes con file:line)
            try {
                const parts = await Promise.all(m.args().map(a => a.jsonValue().catch(() => '')));
                nestedFull.push(parts.join(' | '));
            } catch { nestedFull.push(t); }
        }
    });
    page.on('pageerror', e => errs.push('PAGEERR: ' + e.message.slice(0, 120)));

    await page.goto(BASE + '/login', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    await page.type('input[type="email"]', process.env.QA_EMAIL, { delay: 15 });
    await page.type('input[type="password"]', process.env.QA_PASSWORD, { delay: 15 });
    await Promise.all([page.keyboard.press('Enter'), page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})]);
    await new Promise(r => setTimeout(r, 3000));

    errs.length = 0; // limpiar errores del login
    // recargar varias veces para atrapar el anidamiento intermitente (depende del post)
    for (let i = 0; i < 6 && nestedFull.length === 0; i++) {
        await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle2', timeout: 40000 });
        await new Promise(r => setTimeout(r, 4000));
    }
    if (nestedFull.length) {
        console.log('=== ANIDAMIENTO HTML capturado ===');
        console.log(nestedFull[0].slice(0, 1200));
        await browser.close();
        return;
    }

    const real = errs.filter(e => !e.includes('favicon') && !e.toLowerCase().includes('react devtools') && !e.includes('Failed to load resource'));
    // agrupar
    const groups = {};
    for (const e of real) {
        const key = e.includes('descendant of') ? 'NESTED <a>/<p> HTML'
            : e.includes('Failed to fetch') ? 'Failed to fetch (WOD)'
            : e.includes('cannot contain a nested') ? 'NESTED HTML (nested)'
            : e.slice(0, 60);
        groups[key] = (groups[key] || 0) + 1;
    }
    console.log('=== /dashboard errores de consola (tras fixes) ===');
    console.log('Total:', real.length);
    for (const [k, v] of Object.entries(groups)) console.log(`  ${v}x  ${k}`);
    console.log('\\n--- muestras ---');
    [...new Set(real)].slice(0, 8).forEach(e => console.log('  ' + e));

    await browser.close();
})();
