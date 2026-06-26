import fs from 'fs';
const content = fs.readFileSync('c:/Users/jesus/Documents/AntiGravity/Proyecto1/Rival-web/app/dashboard/FeedPost.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('resolvedWorkoutData')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
