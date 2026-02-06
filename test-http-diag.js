const https = require('https');

const API_KEY = "AIzaSyA-UhWxppfaoQmR6tJO_zl93U13AvwYnUU";
const MODEL = "gemini-pro";

const data = JSON.stringify({
    contents: [{ parts: [{ text: "Hello" }] }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log("--- HTTP DIAGNOSTIC START ---");
console.log(`Probando modelo: ${MODEL}`);

const req = https.request(options, (res) => {
    console.log(`STATUS CODE: ${res.statusCode}`);

    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => {
        try {
            const json = JSON.parse(body);
            console.log("RESPUESTA DETALLADA:");
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.log("RESPUESTA (TEXTO):", body);
        }
    });
});

req.on('error', (error) => {
    console.error("ERROR DE CONEXIÓN:", error);
});

req.write(data);
req.end();
