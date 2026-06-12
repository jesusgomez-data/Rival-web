// Re-verifica los 4 puntos detectados tras los fixes.
const puppeteer = require('puppeteer');
const BASE = 'http://localhost:3000';
const CENTER = 'd1f010aa-628c-4296-bfb1-71c5de4105a1';
const TRAINER = '59322b2c-3016-4882-895a-c162a0b94094';

const ROUTES = [
    ['/trainer/' + TRAINER, 'perfil entrenador (center_reviews)'],
    ['/dashboard/videos', 'videos (posts.caption)'],
    ['/dashboard/community', 'community (gym_events)'],
    ['/dashboard/gyms/' + CENTER + '/settings/billing', 'billing del centro (404?)'],
];

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const ctx = browser.defaultBrowserContext();
    await ctx.overridePermissions(BASE, ['notifications', 'geolocation']);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluateOnNewDocument(() => { try { localStorage.setItem('rival_theme','dark'); localStorage.setItem('rival_tour_completed','true'); } catch(e){} });

    // login
    await page.goto(BASE + '/login', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    await page.type('input[type="email"]', process.env.QA_EMAIL, { delay: 12 });
    await page.type('input[type="password"]', process.env.QA_PASSWORD, { delay: 12 });
    await Promise.all([page.keyboard.press('Enter'), page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 40000 }).catch(()=>{})]);
    await new Promise(r => setTimeout(r, 3000));

    for (const [route, label] of ROUTES) {
        const bag = { console: [], net: [] };
        const onC = m => { if (m.type()==='error') bag.console.push(m.text().replace(/\s+/g,' ').slice(0,120)); };
        const onR = async res => { const s=res.status(); if (s>=400) { let b=''; try{b=(await res.text()).slice(0,120).replace(/\s+/g,' ');}catch(e){} bag.net.push(`[${s}] ${res.url().replace(BASE,'').slice(0,70)} ${b.startsWith('<!DOCTYPE')?'(HTML 404)':b}`); } };
        page.on('console', onC); page.on('response', onR);
        let docStatus = '?';
        try { const resp = await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 40000 }); docStatus = resp ? resp.status() : '?'; await new Promise(r=>setTimeout(r,2800)); } catch(e){ bag.console.push('NAV '+e.message.slice(0,50)); }
        page.off('console', onC); page.off('response', onR);
        const con = bag.console.filter(e => !e.includes('favicon') && !e.includes('Failed to fetch') && !e.includes('Failed to load resource') && !e.toLowerCase().includes('devtools'));
        const net = bag.net.filter(e => !e.includes('/_next/'));
        const ok = con.length===0 && net.length===0 && docStatus===200;
        console.log((ok?'OK  ':'WARN') + ` [doc ${docStatus}] ${label}`);
        con.forEach(e => console.log('       console: ' + e));
        net.forEach(e => console.log('       net: ' + e));
    }
    await browser.close();
})();
