const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

async function test() {
    const API_KEY = "AIzaSyAA3BozjosnhGxvY2zbUkUI409CpuB_IvE".trim();
    const genAI = new GoogleGenerativeAI(API_KEY);
    let output = "--- Testing gemini-2.0-flash ---\n";

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Di 'Hola, ya funciona'");
        output += "SUCCESS: " + result.response.text() + "\n";
    } catch (error) {
        output += "ERROR MESSAGE: " + error.message + "\n";
    }

    fs.writeFileSync("test-output-final.txt", output);
}

test();
