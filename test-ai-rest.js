const https = require("https");
const fs = require("fs");

async function test() {
    const API_KEY = "AIzaSyAA3BozjosnhGxvY2zbUkUI409CpuB_IvE".trim();
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
