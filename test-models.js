const { GoogleGenerativeAI } = require("@google/generative-ai");

require('dotenv').config({ path: '.env.local' });
async function listModels() {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        console.error("No API KEY found in .env.local");
        return;
    }
    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
        // En el SDK de Node, no hay un método directo 'listModels' expuesto de forma sencilla en la clase principal
        // Pero podemos intentar inicializar los más comunes y ver cuál no da 404
        const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-2.0-flash"];

        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                // Solo una pequeña prueba de generación para ver si el modelo existe y es accesible
                await model.generateContent("Hola");
                console.log(`MODELO ACCESIBLE: ${m}`);
            } catch (e) {
                console.log(`MODELO FALLIDO: ${m} - Error: ${e.message}`);
            }
        }
    } catch (error) {
        console.error("Error general:", error);
    }
}

listModels();
