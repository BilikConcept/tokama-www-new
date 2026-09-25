import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "tokama_host_session";

export function getHostSessionSecret() {
  return process.env.TOKAMA_HOST_SESSION_SECRET || process.env.TOKAMA_HOST_PASSWORD || "tokama-local-session";
}

export function isHostRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionSecret = getHostSessionSecret();

  return cookieHeader
    .split(";")
    .map((item) => item.trim())
    .some((item) => item === `${COOKIE_NAME}=${sessionSecret}`);
}

export async function isHostApiRequest(request: Request) {
  if (isHostRequest(request)) return true;

  const authorization = request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return false;
  }

  const token = authorization.slice(7).trim();

  if (!token) return false;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://oiqdwgsfpvcuctvxfjpv.supabase.co";

  const serviceKey =
    process.env.TOKAMA_ADMIN_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!serviceKey) {
    console.log("[TOKAMA HOST AUTH] Missing Supabase service key.");
    return false;
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log("[TOKAMA HOST AUTH] Bearer token rejected.", error?.message || "");
      return false;
    }

    return true;
  } catch (error) {
    console.log(
      "[TOKAMA HOST AUTH] Bearer verification failed.",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

export function unauthorizedResponse() {
  return NextResponse.json(
    {
      ok: false,
      message: "Unauthorized.",
    },
    { status: 401 }
  );
}

export function createHostCookieResponse(data: unknown) {
  const response = NextResponse.json(data);
  const sessionSecret = getHostSessionSecret();

  response.cookies.set(COOKIE_NAME, sessionSecret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

export function clearHostCookieResponse(data: unknown) {
  const response = NextResponse.json(data);

  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
