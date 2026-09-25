export function isTokamaCronAuthorized(request: Request) {
  const expectedSecret = process.env.CRON_SECRET || process.env.TOKAMA_CRON_SECRET;

  if (!expectedSecret) return process.env.NODE_ENV !== "production";

  const authorization = request.headers.get("authorization") || "";
  const bearerSecret = authorization.replace(/^Bearer\s+/i, "").trim();
  const headerSecret = request.headers.get("x-tokama-secret");

  return bearerSecret === expectedSecret || headerSecret === expectedSecret;
}
