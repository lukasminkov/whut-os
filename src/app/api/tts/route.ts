import { NextRequest, NextResponse } from "next/server";

const VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah
const MODEL = "eleven_turbo_v2_5";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 500 });
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.slice(0, 1000),
          model_id: MODEL,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("ElevenLabs error:", res.status, err);
      return NextResponse.json({ error: "TTS failed" }, { status: 502 });
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("TTS route error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
