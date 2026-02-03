const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

async function test() {
    const API_KEY = "AIzaSyAA3BozjosnhGxvY2zbUkUI409CpuB_IvE".trim();
    const genAI = new GoogleGenerativeAI(API_KEY);
    let output = "--- Testing API Key ---\n";

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("test");
        output += "SUCCESS: " + result.response.text() + "\n";
    } catch (error) {
        output += "ERROR TYPE: " + error.name + "\n";
        output += "ERROR MESSAGE: " + error.message + "\n";
        if (error.stack) output += "STACK: " + error.stack + "\n";
    }

    fs.writeFileSync("test-output.txt", output);
}

test();
