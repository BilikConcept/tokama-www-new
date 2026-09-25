import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);

  console.log("[TOKAMA SMS DLR]", Object.fromEntries(url.searchParams.entries()));

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const text = await request.text();

  console.log("[TOKAMA SMS DLR POST]", text);

  return NextResponse.json({ ok: true });
}
