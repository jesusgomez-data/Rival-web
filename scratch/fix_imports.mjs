import fs from 'fs/promises';
import path from 'path';

const rootDirs = [
    'c:\\Users\\jesus\\Documents\\AntiGravity\\Proyecto1\\Rival-web\\app',
    'c:\\Users\\jesus\\Documents\\AntiGravity\\Proyecto1\\Rival-web\\components'
];

async function walk(dir) {
    let results = [];
    const list = await fs.readdir(dir);
    for (let file of list) {
        file = path.resolve(dir, file);
        const stat = await fs.stat(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(await walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    }
    return results;
}

async function fixImports() {
    let files = [];
    for (const d of rootDirs) {
        files = files.concat(await walk(d));
    }
    let changed = 0;
    for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        // Regex to match imports from community folder:
        // matches 'community/' or "community/" or `community/` inside import/dynamic statements
        const newContent = content.replace(/(from\s+['"]|import\s*\(\s*['"])([^'"]*?)community([^'"]*?)(['"])/g, (match, p1, p2, p3, p4) => {
            return `${p1}${p2}explore${p3}${p4}`;
        });
        
        if (content !== newContent) {
            await fs.writeFile(file, newContent, 'utf8');
            console.log(`Updated: ${file}`);
            changed++;
        }
    }
    console.log(`Total files updated: ${changed}`);
}

fixImports().catch(console.error);
