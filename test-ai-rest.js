const https = require("https");
const fs = require("fs");

async function test() {
    const API_KEY = (process.env.GOOGLE_GENAI_API_KEY || "").trim();
    if (!API_KEY) {
        console.log("No API Key found. Set GOOGLE_GENAI_API_KEY env var.");
        return;
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            const json = JSON.parse(data);
            let models = "";
            if (json.models) {
                json.models.forEach(m => {
                    models += m.name + "\n";
                });
            }
            fs.writeFileSync("models-list.txt", models);
        });
    });
}

test();
