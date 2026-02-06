const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkModels() {
    // La clave que nos diste
    const API_KEY = "AIzaSyA-UhWxppfaoQmR6tJO_zl93U13AvwYnUU";
    const genAI = new GoogleGenerativeAI(API_KEY);

    console.log("Probando conexión con API Key...");

    // Intentamos listar modelos si es posible, o probar uno por uno
    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
        "gemini-2.0-flash-exp",
        "gemini-pro"
    ];

    for (const modelName of models) {
        try {
            console.log(`Testing ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hi");
            console.log(`✅ ${modelName}: OK`);
        } catch (error) {
            console.log(`❌ ${modelName}: ${error.message}`);
        }
    }
}

checkModels();
