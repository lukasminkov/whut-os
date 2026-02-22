import { NextResponse } from "next/server";

// Store access requests in Vercel KV or a simple in-memory + log approach
// For production, swap to Supabase/Postgres
// For now, we log to stdout (visible in Vercel logs) and return success

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, company, email, phone } = body;

    if (!name || !company || !email || !phone) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Log the request (visible in Vercel Function Logs)
    console.log("[ACCESS_REQUEST]", JSON.stringify({
      name,
      company,
      email,
      phone,
      timestamp: new Date().toISOString(),
    }));

    // If SUPABASE_URL and SUPABASE_KEY are set, also store in DB
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/access_requests`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            name,
            company,
            email,
            phone,
            created_at: new Date().toISOString(),
          }),
        });
      } catch (dbErr) {
        // Don't fail the request if DB write fails
        console.error("[ACCESS_REQUEST_DB_ERROR]", dbErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
