import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function listModels() {
  try {
    const models = await groq.models.list();
    console.log(JSON.stringify(models, null, 2));
  } catch (err) {
    console.error(err);
  }
}

listModels();
