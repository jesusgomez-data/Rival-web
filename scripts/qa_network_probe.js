// Identifica las peticiones que fallan (4xx/5xx) en paginas autenticadas.
const puppeteer = require('puppeteer');
const BASE = 'http://localhost:3000';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 430, height: 920 });

    const failures = [];
    page.on('response', async (resp) => {
        const s = resp.status();
        if (s >= 400) {
            let body = '';
            try { body = (await resp.text()).slice(0, 200); } catch (e) {}
            failures.push({ status: s, url: resp.url().slice(0, 160), body });
        }
    });

    // login
    await page.goto(BASE + '/login', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    await page.type('input[type="email"]', process.env.QA_EMAIL, { delay: 15 });
    await page.type('input[type="password"]', process.env.QA_PASSWORD, { delay: 15 });
    await Promise.all([page.keyboard.press('Enter'), page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})]);
    await new Promise(r => setTimeout(r, 2500));

    for (const route of ['/dashboard/leaderboard', '/dashboard/profile', '/dashboard/gyms']) {
        failures.length = 0;
        await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2500));
        console.log('\\n===== ' + route + ' =====');
        if (!failures.length) { console.log('  sin fallos de red'); continue; }
        for (const f of failures) {
            console.log(`  [${f.status}] ${f.url}`);
            if (f.body) console.log(`         body: ${f.body.replace(/\\n/g, ' ')}`);
        }
    }

    await browser.close();
})();
