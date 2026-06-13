import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set in env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function list() {
  try {
    console.log("Querying models using API Key:", apiKey.substring(0, 8) + "...");
    
    // We can fetch via REST directly to see what the API returns for listModels
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    console.log("\nAvailable Models:");
    data.models?.forEach((m) => {
      console.log(`- ${m.name} (supports: ${m.supportedGenerationMethods.join(", ")})`);
    });
  } catch (e) {
    console.error("Error listing models:", e);
  }
}

list();
