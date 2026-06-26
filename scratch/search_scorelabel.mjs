import fs from 'fs';
const content = fs.readFileSync('c:/Users/jesus/Documents/AntiGravity/Proyecto1/Rival-web/components/community/WodCard.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('scoreLabel')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
