// Barrido completo: visita todas las paginas clave (publicas + autenticadas +
// gestion de centro) y reporta errores de consola Y fallos de red (4xx/5xx)
// con la causa. Objetivo: detectar queries rotas (RLS/columnas), 404, etc.
const puppeteer = require('puppeteer');
const BASE = 'http://localhost:3000';
const CENTER = process.env.QA_CENTER_ID || 'd1f010aa-628c-4296-bfb1-71c5de4105a1';

const PUBLIC = [
    '/', '/for-centers', '/center-signup', '/signup', '/login', '/onboarding',
    '/legal/privacy', '/legal/terms', '/legal/support',
    `/gym/${CENTER}`, `/trainer/59322b2c-3016-4882-895a-c162a0b94094`,
];
const AUTH = [
    '/dashboard', '/dashboard/gyms', '/dashboard/training', '/dashboard/training/logs',
    '/dashboard/leaderboard', '/dashboard/messages', '/dashboard/profile',
    '/dashboard/notifications', '/dashboard/nutrition', '/dashboard/community',
    '/dashboard/videos', '/dashboard/settings/billing', '/dashboard/marketing',
];
const CENTERP = [
    '', '/members', '/schedule', '/wods', '/programming', '/analytics', '/store',
    '/team', '/memberships', '/checkin', '/communications', '/feed', '/settings/billing',
].map(s => `/dashboard/gyms/${CENTER}${s}`);

function attach(page, bag) {
    page.on('console', m => { if (m.type() === 'error') bag.console.push(m.text().replace(/\s+/g, ' ').slice(0, 110)); });
    page.on('pageerror', e => bag.console.push('PAGEERR: ' + e.message.slice(0, 110)));
    page.on('response', async res => {
        const s = res.status();
        if (s >= 400) {
            let body = '';
            try { body = (await res.text()).slice(0, 140).replace(/\s+/g, ' '); } catch (e) {}
            bag.net.push(`[${s}] ${res.url().replace(BASE, '').slice(0, 90)} ${body}`);
        }
    });
}

async function sweep(page, routes, label) {
    console.log('\\n===== ' + label + ' =====');
    let total = 0;
    for (const route of routes) {
        const bag = { console: [], net: [] };
        const off = (m) => {}; // placeholder
        const cListeners = []; // we use a fresh bag each route via closures
        const onConsole = m => { if (m.type() === 'error') bag.console.push(m.text().replace(/\s+/g, ' ').slice(0, 110)); };
        const onPageErr = e => bag.console.push('PAGEERR: ' + e.message.slice(0, 110));
        const onResp = async res => { const s = res.status(); if (s >= 400) { let b=''; try{b=(await res.text()).slice(0,140).replace(/\s+/g,' ');}catch(e){} bag.net.push(`[${s}] ${res.url().replace(BASE,'').slice(0,80)} ${b}`); } };
        page.on('console', onConsole); page.on('pageerror', onPageErr); page.on('response', onResp);
        try {
            await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 40000 });
            await new Promise(r => setTimeout(r, 2800));
        } catch (e) { bag.console.push('NAV: ' + e.message.slice(0, 60)); }
        page.off('console', onConsole); page.off('pageerror', onPageErr); page.off('response', onResp);

        // filtrar ruido transitorio conocido (cancelaciones de navegacion)
        const con = bag.console.filter(e => !e.includes('favicon') && !e.toLowerCase().includes('react devtools') && !e.includes('Failed to fetch') && !e.includes('Failed to load resource'));
        const net = bag.net.filter(e => !e.includes('/_next/') && !e.includes('favicon'));
        total += con.length + net.length;
        const mark = (con.length + net.length) === 0 ? 'OK  ' : 'WARN';
        const short = route.replace(CENTER, '<id>').replace('59322b2c-3016-4882-895a-c162a0b94094', '<tid>');
        console.log(`${mark} ${short}`);
        con.slice(0, 3).forEach(e => console.log('       console: ' + e));
        net.slice(0, 4).forEach(e => console.log('       net: ' + e));
    }
    return total;
}

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const ctx = browser.defaultBrowserContext();
    await ctx.overridePermissions(BASE, ['notifications', 'geolocation']);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(() => { try { localStorage.setItem('rival_theme','dark'); localStorage.setItem('rival_tour_completed','true'); localStorage.setItem('rival_install_prompt_seen', String(Date.now())); } catch(e){} });

    let grand = 0;
    grand += await sweep(page, PUBLIC, 'PUBLICAS');

    if (process.env.QA_EMAIL) {
        await page.goto(BASE + '/login', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 1200));
        await page.type('input[type="email"]', process.env.QA_EMAIL, { delay: 12 });
        await page.type('input[type="password"]', process.env.QA_PASSWORD, { delay: 12 });
        await Promise.all([page.keyboard.press('Enter'), page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 40000 }).catch(()=>{})]);
        await new Promise(r => setTimeout(r, 3500));
        grand += await sweep(page, AUTH, 'AUTENTICADAS');
        grand += await sweep(page, CENTERP, 'GESTION DE CENTRO');
    }

    console.log('\\n========================================');
    console.log('TOTAL incidencias (console + net, sin ruido transitorio): ' + grand);
    await browser.close();
})();
