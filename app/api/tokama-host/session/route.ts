import { NextResponse } from "next/server";
import { isHostRequest } from "@/lib/tokama/hostAuth";

export async function GET(request: Request) {
  return NextResponse.json({
    ok: true,
    authenticated: isHostRequest(request),
  });
}
