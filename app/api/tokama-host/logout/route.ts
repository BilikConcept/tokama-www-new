import { clearHostCookieResponse } from "@/lib/tokama/hostAuth";

export async function POST() {
  return clearHostCookieResponse({
    ok: true,
  });
}
