
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('--- NEW VAPID KEYS ---');
console.log('PUBLIC_KEY=' + keys.publicKey);
console.log('PRIVATE_KEY=' + keys.privateKey);
console.log('----------------------');
const pubBuf = Buffer.from(keys.publicKey, 'base64');
console.log('New Public Key Byte Length:', pubBuf.length);
