import { NextResponse } from "next/server";

// Vercel expone el SHA del commit desplegado como variable de entorno en
// runtime — cambia en cada deploy, así que sirve como "número de versión"
// gratis sin tener que mantenerlo a mano. En local (sin esa variable) cae a
// 'dev', donde este check nunca debe disparar avisos de todas formas.
export async function GET() {
    const version = process.env.VERCEL_GIT_COMMIT_SHA || "dev";
    return NextResponse.json({ version }, { headers: { "Cache-Control": "no-store" } });
}
