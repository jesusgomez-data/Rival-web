// Renderiza graficos de marca (HTML/CSS) a PNG para las secciones del PDF
// que no tienen captura de pantalla. Uso: node scripts/render_graphics.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '_shots');
const RED = '#EF4444', RED2 = '#DC2626';

const base = `
  * { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI',Arial,sans-serif; }
  body { background:#000; color:#fff; }
  .wrap { padding:48px; background:radial-gradient(circle at 50% 0%, rgba(239,68,68,0.12), #000 60%); min-height:100%; }
  .kicker { color:${RED}; font-size:13px; font-weight:800; letter-spacing:3px; text-transform:uppercase; margin-bottom:8px; }
  h1 { font-size:34px; font-weight:900; font-style:italic; text-transform:uppercase; letter-spacing:-1px; margin-bottom:28px; }
  h1 .r { color:${RED}; }
  .card { background:#151515; border:1px solid #2a2a2a; border-radius:18px; padding:22px; }
`;

// ---- A. Ecosistema (Indice) ----
const ecosystem = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${base}
  .cols { display:flex; gap:24px; align-items:stretch; }
  .col { flex:1; }
  .col h2 { font-size:18px; font-weight:900; text-transform:uppercase; font-style:italic; margin-bottom:14px; display:flex; align-items:center; gap:10px; }
  .b2c h2 { color:#fff; } .b2b h2 { color:${RED}; }
  .col ul { list-style:none; } .col li { font-size:14px; color:#cbd5e1; padding:9px 0; border-bottom:1px solid #1e1e1e; display:flex; gap:10px; align-items:center; }
  .col li::before { content:''; width:7px; height:7px; border-radius:50%; background:${RED}; flex:none; }
  .mid { display:flex; flex-direction:column; align-items:center; justify-content:center; width:90px; }
  .mid .plus { width:60px; height:60px; border-radius:50%; background:${RED}; display:flex; align-items:center; justify-content:center; font-size:30px; font-weight:900; box-shadow:0 0 30px rgba(239,68,68,.5); }
  .mid .line { flex:1; width:2px; background:linear-gradient(#2a2a2a, ${RED}, #2a2a2a); }
  .tag { display:inline-block; font-size:11px; font-weight:800; letter-spacing:1px; padding:4px 10px; border-radius:20px; margin-top:14px; }
  .b2c .tag { background:rgba(255,255,255,.08); color:#fff; } .b2b .tag { background:rgba(239,68,68,.15); color:${RED}; }
</style></head><body><div class="wrap">
  <div class="kicker">Un solo ecosistema</div>
  <h1>Red social <span class="r">+</span> gestion de centro</h1>
  <div class="cols">
    <div class="col b2c card">
      <h2>🏋️ Para tus atletas</h2>
      <ul><li>Feed social, historias y videos</li><li>Registro de entrenamientos y PRs</li><li>WODs y leaderboards del centro</li><li>Duelos y ranking global</li><li>Notificaciones push</li></ul>
      <span class="tag">EXPERIENCIA B2C</span>
    </div>
    <div class="mid"><div class="line"></div><div class="plus">+</div><div class="line"></div></div>
    <div class="col b2b card">
      <h2>🏢 Para tu centro</h2>
      <ul><li>Miembros, clases y check-in</li><li>Programacion de WODs</li><li>Tienda y cobros con Stripe</li><li>Comunicaciones y comunidad</li><li>Analitica e inteligencia de negocio</li></ul>
      <span class="tag">GESTION B2B</span>
    </div>
  </div>
  <p style="text-align:center; color:#9ca3af; font-size:13px; margin-top:24px; font-style:italic;">Cada entrenamiento que publica un miembro es marketing organico para tu centro.</p>
</div></body></html>`;

// ---- B. Planes (Seccion 13) ----
const plans = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${base}
  .cards { display:flex; gap:16px; }
  .p { flex:1; background:#151515; border:1px solid #2a2a2a; border-radius:18px; padding:20px; position:relative; }
  .p.hot { border-color:${RED}; box-shadow:0 0 30px rgba(239,68,68,.15); }
  .p .name { font-size:13px; font-weight:900; letter-spacing:2px; text-transform:uppercase; color:#9ca3af; }
  .p.hot .name { color:${RED}; }
  .p .price { font-size:30px; font-weight:900; margin:8px 0 2px; }
  .p .per { font-size:11px; color:#6b7280; margin-bottom:14px; }
  .p ul { list-style:none; } .p li { font-size:12px; color:#cbd5e1; padding:6px 0; display:flex; gap:8px; }
  .p li::before { content:'✓'; color:${RED}; font-weight:900; }
  .badge { position:absolute; top:-10px; right:14px; background:${RED}; color:#fff; font-size:9px; font-weight:800; letter-spacing:1px; padding:4px 10px; border-radius:20px; }
</style></head><body><div class="wrap">
  <div class="kicker">Precios para centros</div>
  <h1>Planes <span class="r">RIVAL</span></h1>
  <div class="cards">
    <div class="p"><div class="name">Free</div><div class="price">0€</div><div class="per">/mes</div>
      <ul><li>Hasta 50 miembros</li><li>10 clases/semana</li><li>Check-in</li><li>Perfil publico</li></ul></div>
    <div class="p hot"><div class="badge">POPULAR</div><div class="name">Starter</div><div class="price">49,99€</div><div class="per">/mes</div>
      <ul><li>Clases ilimitadas</li><li>Tienda</li><li>Push + pruebas</li><li>Google Calendar</li></ul></div>
    <div class="p"><div class="name">Pro</div><div class="price">99,99€</div><div class="per">/mes</div>
      <ul><li>WOD Generator IA</li><li>Prediccion de churn</li><li>Benchmarking</li><li>Reportes auto</li></ul></div>
    <div class="p"><div class="name">Enterprise</div><div class="price">A medida</div><div class="per">cadenas y redes</div>
      <ul><li>Marca blanca</li><li>API propia</li><li>Soporte 24/7</li><li>Multi-centro</li></ul></div>
  </div>
  <p style="text-align:center; color:#9ca3af; font-size:12px; margin-top:22px;">Precios de lanzamiento para los primeros 50 centros · cambia de plan cuando quieras</p>
</div></body></html>`;

// ---- C. Checklist (Seccion 14) ----
const checklist = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${base}
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px 28px; }
  .step { display:flex; gap:14px; align-items:flex-start; background:#141414; border:1px solid #232323; border-radius:14px; padding:14px 16px; }
  .num { width:30px; height:30px; border-radius:9px; background:${RED}; color:#fff; font-weight:900; display:flex; align-items:center; justify-content:center; flex:none; font-size:14px; }
  .txt { font-size:13px; color:#e5e7eb; line-height:1.4; padding-top:4px; }
</style></head><body><div class="wrap">
  <div class="kicker">Pon tu centro en marcha</div>
  <h1>Checklist de <span class="r">lanzamiento</span></h1>
  <div class="grid">
    <div class="step"><div class="num">1</div><div class="txt">Crea el centro en rivalfit.app/for-centers</div></div>
    <div class="step"><div class="num">2</div><div class="txt">Completa el perfil: logo, fotos y ubicacion</div></div>
    <div class="step"><div class="num">3</div><div class="txt">Da de alta a tu equipo (coaches) y roles</div></div>
    <div class="step"><div class="num">4</div><div class="txt">Carga el horario semanal de clases</div></div>
    <div class="step"><div class="num">5</div><div class="txt">Publica el primer WOD del dia</div></div>
    <div class="step"><div class="num">6</div><div class="txt">Importa a tus miembros y sus planes</div></div>
    <div class="step"><div class="num">7</div><div class="txt">Configura la tienda y conecta Stripe</div></div>
    <div class="step"><div class="num">8</div><div class="txt">Activa push y publica tu primer anuncio</div></div>
    <div class="step"><div class="num">9</div><div class="txt">Crea una oferta de clase de prueba</div></div>
    <div class="step"><div class="num">10</div><div class="txt">Pide a tus miembros que instalen la app</div></div>
  </div>
</div></body></html>`;

const JOBS = [
    ['ecosystem', ecosystem, 1200, 720],
    ['graphic-plans', plans, 1200, 620],
    ['graphic-checklist', checklist, 1200, 600],
];

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
    for (const [name, html, w, h] of JOBS) {
        const page = await browser.newPage();
        await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 300));
        await page.screenshot({ path: path.join(OUT, name + '.png') });
        console.log('OK', name + '.png');
        await page.close();
    }
    await browser.close();
    console.log('DONE');
})();
