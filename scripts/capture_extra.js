// Capturas adicionales para la guia: perfil publico del centro (lead capture)
// y muro social. Uso: node scripts/capture_extra.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, '_shots');
const CENTER_ID = process.env.QA_CENTER_ID || 'd1f010aa-628c-4296-bfb1-71c5de4105a1';

const TARGETS = [
    [`/gym/${CENTER_ID}`, 'public-center', { width: 1280, height: 1400 }],
];

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
        try { localStorage.setItem('rival_theme', 'dark'); localStorage.setItem('rival_install_prompt_seen', String(Date.now())); } catch (e) {}
        window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); e.stopImmediatePropagation(); }, true);
    });
    for (const [route, file, vp] of TARGETS) {
        try {
            await page.setViewport({ ...vp, deviceScaleFactor: 2 });
            await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 45000 });
            await new Promise(r => setTimeout(r, 3000));
            await page.evaluate(() => {
                document.querySelectorAll('div').forEach(d => {
                    if (d.textContent && d.textContent.includes('INSTALA RIVAL FIT') && (d.className || '').includes('fixed')) d.remove();
                });
                document.querySelectorAll('nextjs-portal,[data-nextjs-toast]').forEach(e => e.remove());
            }).catch(() => {});
            if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
            await page.screenshot({ path: path.join(OUT, file + '.png') });
            console.log('OK', route, '->', file + '.png');
        } catch (e) { console.log('FAIL', route, e.message); }
    }
    await browser.close();
    console.log('DONE');
})();
