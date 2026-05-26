/**
 * Generates PNG icons needed for PWA from the SVG logo.
 * Run once: node scripts/generate-pwa-icons.mjs
 */
import puppeteer from 'puppeteer';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');

const svgContent = readFileSync(join(publicDir, 'logo.svg'), 'utf8');
const svgBase64 = Buffer.from(svgContent).toString('base64');

const sizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

const notificationIcons = [
  { name: 'msg.png',     emoji: '💬', bg: '#1d4ed8' },
  { name: 'like.png',    emoji: '❤️', bg: '#dc2626' },
  { name: 'comment.png', emoji: '🗨️', bg: '#16a34a' },
  { name: 'follow.png',  emoji: '👤', bg: '#9333ea' },
  { name: 'duel.png',    emoji: '⚔️', bg: '#ea580c' },
];

async function run() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Generate main icons from SVG
  for (const { size, name } of sizes) {
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(`
      <html>
        <body style="margin:0;padding:0;background:#000000;">
          <img src="data:image/svg+xml;base64,${svgBase64}"
               width="${size}" height="${size}"
               style="display:block;" />
        </body>
      </html>
    `);
    await page.waitForSelector('img');
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({ path: join(publicDir, name), type: 'png', clip: { x:0,y:0,width:size,height:size } });
    console.log(`✓ Generated ${name} (${size}x${size})`);
  }

  // Generate notification icons folder
  mkdirSync(join(publicDir, 'icons'), { recursive: true });

  for (const { name, emoji, bg } of notificationIcons) {
    await page.setViewport({ width: 96, height: 96, deviceScaleFactor: 1 });
    await page.setContent(`
      <html>
        <body style="margin:0;padding:0;width:96px;height:96px;background:${bg};
                     border-radius:48px;display:flex;align-items:center;
                     justify-content:center;font-size:52px;">
          ${emoji}
        </body>
      </html>
    `);
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({ path: join(publicDir, 'icons', name), type: 'png', clip: { x:0,y:0,width:96,height:96 } });
    console.log(`✓ Generated icons/${name}`);
  }

  await browser.close();
  console.log('\nAll PWA icons generated successfully.');
  console.log('Run `git add public/*.png public/icons/` to stage them.');
}

run().catch(err => { console.error(err); process.exit(1); });
