const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env' }); // Explicitly load .env

async function test() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Testing with Key:", key ? key.substring(0, 10) + "..." : "UNDEFINED");

    if (!key) {
        console.error("NO KEY FOUND");
        return;
    }

    const genAI = new GoogleGenerativeAI(key);

    // Test 1.5 Flash
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Say Hello");
        console.log("Gemini 1.5 Flash: SUCCESS", result.response.text());
    } catch (e) {
        console.log("Gemini 1.5 Flash: FAILED", e.message);
    }

    // Test 2.0 Flash
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Say 'SYSTEM READY'");
        console.log("Gemini 2.0 Flash: SUCCESS", result.response.text());
    } catch (e) {
        console.log("Gemini 2.0 Flash: FAILED", e.message);
    }
}

test();
