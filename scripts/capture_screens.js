// Captura pantallas reales de la app (Puppeteer) para la guia PDF.
// Uso: node scripts/capture_screens.js
// Requiere el dev server corriendo en http://localhost:3000
const puppeteer = require('puppeteer');
const path = require('path');

const OUT = path.join(__dirname, '_shots');
const BASE = 'http://localhost:3000';

const PUBLIC = [
    // [ruta, archivo, viewport, fullPageScrollPx?]
    ['/for-centers', 'for-centers', { width: 1280, height: 900 }, 0],
    ['/center-signup', 'center-signup', { width: 430, height: 920 }, 0],
    ['/', 'landing', { width: 430, height: 920 }, 0],
];

async function dismissOverlays(page) {
    await page.evaluate(() => {
        // Quitar el prompt de instalacion PWA (puppeteer dispara beforeinstallprompt)
        document.querySelectorAll('div').forEach(d => {
            if (d.textContent && d.textContent.includes('INSTALA RIVAL FIT') && d.className.includes('fixed')) {
                d.remove();
            }
        });
        // Quitar indicadores de Next dev
        document.querySelectorAll('nextjs-portal,[data-next-mark],#__next-build-watcher,[data-nextjs-dialog-overlay]').forEach(e => e.remove());
        const dev = document.querySelector('[data-nextjs-toast]');
        if (dev) dev.remove();
    }).catch(() => {});
}

async function shoot(page, route, file, vp) {
    await page.setViewport({ ...vp, deviceScaleFactor: 2 });
    await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 2500)); // dejar asentar animaciones
    await dismissOverlays(page);
    await new Promise(r => setTimeout(r, 400));
    const fs = require('fs');
    if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: path.join(OUT, file + '.png') });
    console.log('OK', route, '->', file + '.png');
}

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Forzar tema oscuro + suprimir el prompt de instalacion para capturas limpias
    await page.evaluateOnNewDocument(() => {
        try {
            localStorage.setItem('rival_theme', 'dark');
            localStorage.setItem('rival_install_prompt_seen', String(Date.now()));
            localStorage.setItem('rival_tour_completed', 'true');   // evita modal de bienvenida
            localStorage.setItem('rival_plus_hint_seen', 'true');
        } catch (e) {}
        // Bloquear beforeinstallprompt en fase de captura: impide que el componente
        // muestre el prompt PWA (puppeteer lo dispara siempre en Chrome).
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
        }, true);
    });
    // Ocultar el indicador de build de Next dev en las capturas
    await page.evaluateOnNewDocument(() => {
        const inject = () => {
            const root = document.head || document.documentElement;
            if (!root) return;
            const s = document.createElement('style');
            s.textContent = 'nextjs-portal,[data-nextjs-toast],#__next-build-watcher{display:none!important}';
            root.appendChild(s);
        };
        if (document.documentElement) inject();
        else document.addEventListener('DOMContentLoaded', inject);
    });

    for (const [route, file, vp] of PUBLIC) {
        try { await shoot(page, route, file, vp); }
        catch (e) { console.log('FAIL', route, e.message); }
    }

    // ---- Autenticado (si hay credenciales en env QA_EMAIL/QA_PASSWORD) ----
    const fs = require('fs');
    const email = process.env.QA_EMAIL;
    const pass = process.env.QA_PASSWORD;
    const authErrors = [];
    page.on('console', m => { if (m.type() === 'error') authErrors.push(m.text().slice(0, 90)); });
    page.on('pageerror', e => authErrors.push('PAGEERR: ' + e.message.slice(0, 90)));

    if (email && pass) {
        try {
            await page.setViewport({ width: 430, height: 920, deviceScaleFactor: 2 });
            await page.goto(BASE + '/login', { waitUntil: 'networkidle2' });
            await new Promise(r => setTimeout(r, 1500));
            await page.type('input[type="email"]', email, { delay: 20 });
            await page.type('input[type="password"]', pass, { delay: 20 });
            await Promise.all([
                page.keyboard.press('Enter'),
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
            ]);
            await new Promise(r => setTimeout(r, 3500));
            const loggedIn = !page.url().includes('/login');
            console.log('LOGIN', loggedIn ? 'OK' : 'FALLO', '-> at', page.url());
            if (!loggedIn) { await browser.close(); console.log('DONE'); return; }

            const AUTH = [
                ['/dashboard', 'dashboard-feed'],
                ['/dashboard/gyms', 'gyms'],
                ['/dashboard/training', 'training'],
                ['/dashboard/leaderboard', 'leaderboard'],
                ['/dashboard/messages', 'messages'],
                ['/dashboard/profile', 'profile'],
            ];
            for (const [route, file] of AUTH) {
                try {
                    const before = authErrors.length;
                    const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 40000 });
                    await new Promise(r => setTimeout(r, 3000));
                    await dismissOverlays(page);
                    await new Promise(r => setTimeout(r, 400));
                    await page.screenshot({ path: path.join(OUT, file + '.png') });
                    const errs = authErrors.length - before;
                    console.log(`OK (auth) [${resp ? resp.status() : '?'}] ${route} -> ${file}.png` + (errs ? `  (${errs} console err)` : ''));
                } catch (e) { console.log('FAIL (auth)', route, e.message); }
            }

            // Entrar a un centro concreto para capturar gestion interna
            try {
                let centerId = process.env.QA_CENTER_ID || null;
                if (!centerId) {
                    await page.goto(BASE + '/dashboard/gyms', { waitUntil: 'domcontentloaded' });
                    await new Promise(r => setTimeout(r, 3000));
                    centerId = await page.evaluate(() => {
                        const a = [...document.querySelectorAll('a[href*="/dashboard/gyms/"]')]
                            .map(x => x.getAttribute('href'))
                            .find(h => /\/dashboard\/gyms\/[0-9a-f-]{8,}/.test(h));
                        if (!a) return null;
                        const m = a.match(/\/dashboard\/gyms\/([0-9a-f-]{8,})/);
                        return m ? m[1] : null;
                    });
                }
                console.log('centerId:', centerId || '(ninguno: la cuenta no gestiona centros)');
                if (centerId) {
                    // Pantallas de gestion = dashboards admin -> viewport desktop ancho
                    await page.setViewport({ width: 1366, height: 1000, deviceScaleFactor: 2 });
                    const SUB = [
                        [`/dashboard/gyms/${centerId}`, 'center-dashboard'],
                        [`/dashboard/gyms/${centerId}/members`, 'center-members'],
                        [`/dashboard/gyms/${centerId}/schedule`, 'center-schedule'],
                        [`/dashboard/gyms/${centerId}/wods`, 'center-wods'],
                        [`/dashboard/gyms/${centerId}/programming`, 'center-programming'],
                        [`/dashboard/gyms/${centerId}/analytics`, 'center-analytics'],
                        [`/dashboard/gyms/${centerId}/store`, 'center-store'],
                        [`/dashboard/gyms/${centerId}/team`, 'center-team'],
                        [`/dashboard/gyms/${centerId}/memberships`, 'center-memberships'],
                        [`/dashboard/gyms/${centerId}/checkin`, 'center-checkin'],
                        [`/dashboard/gyms/${centerId}/communications`, 'center-communications'],
                    ];
                    for (const [route, file] of SUB) {
                        try {
                            const before = authErrors.length;
                            const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 40000 });
                            await new Promise(r => setTimeout(r, 3200));
                            await dismissOverlays(page);
                            await new Promise(r => setTimeout(r, 400));
                            await page.screenshot({ path: path.join(OUT, file + '.png') });
                            const errs = authErrors.length - before;
                            console.log(`OK (center) [${resp ? resp.status() : '?'}] ${route.replace(centerId,'<id>')} -> ${file}.png` + (errs ? `  (${errs} console err)` : ''));
                        } catch (e) { console.log('FAIL (center)', route.replace(centerId,'<id>'), e.message); }
                    }
                }
            } catch (e) { console.log('CENTER nav fail:', e.message); }

            const realAuthErrs = authErrors.filter(e => !e.includes('favicon') && !e.toLowerCase().includes('react devtools'));
            console.log('\\n=== Errores de consola en flujos autenticados: ' + realAuthErrs.length + ' ===');
            realAuthErrs.slice(0, 8).forEach(e => console.log('   - ' + e));
        } catch (e) {
            console.log('LOGIN FAILED:', e.message);
        }
    } else {
        console.log('(sin QA_EMAIL/QA_PASSWORD: solo pantallas publicas)');
    }

    await browser.close();
    console.log('DONE');
})();
