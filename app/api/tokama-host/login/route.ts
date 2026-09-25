import { NextResponse } from "next/server";
import { createHostCookieResponse } from "@/lib/tokama/hostAuth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = body?.password;

  const expectedPassword = process.env.TOKAMA_HOST_PASSWORD || "tokama";

  if (!password || password !== expectedPassword) {
    return NextResponse.json(
      {
        ok: false,
        message: "Invalid password.",
      },
      { status: 401 }
    );
  }

  return createHostCookieResponse({
    ok: true,
  });
}
