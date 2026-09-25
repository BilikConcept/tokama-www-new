import { NextResponse } from "next/server";
import { sendTokamaSms } from "@/lib/tokamaNotifications";

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      const secret = request.headers.get("x-tokama-secret");

      if (!process.env.TOKAMA_CRON_SECRET || secret !== process.env.TOKAMA_CRON_SECRET) {
        return NextResponse.json(
          { ok: false, message: "Unauthorized." },
          { status: 401 }
        );
      }
    }

    const body = await request.json().catch(() => null);

    const phone = String(body?.phone || "").trim();
    const text = String(body?.text || "TOKAMA test SMS.").trim();

    if (!phone) {
      return NextResponse.json(
        { ok: false, message: "Missing phone number." },
        { status: 400 }
      );
    }

    const result = await sendTokamaSms({
      to: phone,
      text,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown SMS error.",
      },
      { status: 500 }
    );
  }
}
