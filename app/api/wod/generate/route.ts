import { NextRequest, NextResponse } from "next/server";
import WODGenerator, { WODRequest } from "@/lib/wod-generator";
import { rateLimiters, getClientIdentifier, setRateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // 🚦 Rate limiting (máximo 10 generaciones por hora)
    const identifier = getClientIdentifier(request);
    const rateLimit = await rateLimiters.classes.limit(identifier); // Reusing classes limiter

    if (!rateLimit.success) {
      const headers = setRateLimitHeaders(new Headers(), rateLimit);
      return NextResponse.json(
        {
          error: "Too many WOD generations. Please try again later.",
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        { status: 429, headers }
      );
    }

    const body: WODRequest = await request.json();

    // Validar request
    if (!body.workoutType || !body.duration || !body.fitnessLevel) {
      return NextResponse.json(
        { error: "Missing required fields: workoutType, duration, fitnessLevel" },
        { status: 400 }
      );
    }

    // Generar WOD con Groq AI (timeout de 25s para no colgarse en móvil)
    const generator = new WODGenerator();
    const wodPromise = generator.generateWOD(body);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("WOD generation timed out. Intenta de nuevo.")), 25000)
    );
    const wod = await Promise.race([wodPromise, timeoutPromise]);

    return NextResponse.json({
      success: true,
      wod,
    });
  } catch (error: any) {
    console.error("WOD generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate WOD" },
      { status: 500 }
    );
  }
}
