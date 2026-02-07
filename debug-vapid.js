
const webpush = require('web-push');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));

const publicKey = envConfig.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
const privateKey = envConfig.VAPID_PRIVATE_KEY?.trim();

console.log('Public Key:', publicKey);
console.log('Public Key Length:', publicKey?.length);
console.log('Private Key:', privateKey);
console.log('Private Key Length:', privateKey?.length);

try {
    const raw = publicKey;
    const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const buf = Buffer.from(base64, 'base64');
    console.log('Decoded byte length:', buf.length);
    console.log('Buffer hex:', buf.toString('hex'));
} catch (e) {
    console.log('Error decoding:', e.message);
}

try {
    webpush.setVapidDetails(
        'mailto:support@rivalfit.app',
        publicKey,
        privateKey
    );
    console.log('SUCCESS: VAPID details set correctly!');
} catch (error) {
    console.log('FAILURE:', error.message);
}
