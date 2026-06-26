import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const srcDir = 'c:/Users/jesus/Documents/AntiGravity/Proyecto1/Rival-web/branding/logos';
const distDir = 'c:/Users/jesus/Documents/AntiGravity/Proyecto1/Rival-web/branding/logos_png';

// Asegurar que el directorio de salida existe
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

async function convert() {
  console.log('Iniciando conversión de SVGs a PNGs con Puppeteer...');
  
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.svg'));
  
  if (files.length === 0) {
    console.log('No se encontraron archivos SVG.');
    return;
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(distDir, file.replace('.svg', '.png'));
    
    console.log(`Procesando: ${file} -> ${path.basename(destPath)}`);
    
    const svgContent = fs.readFileSync(srcPath, 'utf8');

    // Extraer ancho y alto si están definidos
    let width = 500;
    let height = 500;
    
    const widthMatch = svgContent.match(/width="([^"]+)"/);
    const heightMatch = svgContent.match(/height="([^"]+)"/);
    
    if (widthMatch) width = parseInt(widthMatch[1], 10);
    if (heightMatch) height = parseInt(heightMatch[1], 10);

    // Ajustar viewport
    await page.setViewport({ width, height });

    // Cargar contenido
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: transparent;
            overflow: hidden;
          }
          svg {
            display: block;
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
      </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'load' });

    // Tomar captura con fondo transparente
    await page.screenshot({
      path: destPath,
      omitBackground: true,
      type: 'png'
    });

    console.log(`Convertido con éxito: ${destPath} (${width}x${height}px)`);
  }

  await browser.close();
  console.log('Conversión finalizada con éxito.');
}

convert().catch(err => {
  console.error('Error durante la conversión:', err);
});
