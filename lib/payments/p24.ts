import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

export type P24Environment = "demo" | "sandbox" | "production";

export type P24Config = {
  environment: P24Environment;
  merchantId?: string;
  posId?: string;
  crc?: string;
  apiKey?: string;
  apiBaseUrl: string;
};

export function getP24Config(): P24Config {
  const environment = (process.env.P24_ENVIRONMENT || "demo") as P24Environment;

  if (!(["demo", "sandbox", "production"] as const).includes(environment)) {
    throw new Error("Unsupported P24_ENVIRONMENT.");
  }

  return {
    environment,
    merchantId: process.env.P24_MERCHANT_ID,
    posId: process.env.P24_POS_ID,
    crc: process.env.P24_CRC,
    apiKey: process.env.P24_API_KEY,
    apiBaseUrl:
      process.env.P24_API_BASE_URL ||
      (environment === "production"
        ? "https://secure.przelewy24.pl"
        : "https://sandbox.przelewy24.pl"),
  };
}

export function assertRealP24Credentials(config = getP24Config()) {
  if (config.environment === "demo") {
    throw new Error(
      "Przelewy24 nie jest jeszcze skonfigurowane. Ustaw środowisko sandbox lub production oraz dane sklepu."
    );
  }

  const missing = [
    ["P24_MERCHANT_ID", config.merchantId],
    ["P24_POS_ID", config.posId],
    ["P24_CRC", config.crc],
    ["P24_API_KEY", config.apiKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(`Missing Przelewy24 credentials: ${missing.join(", ")}.`);
  }
}

function sha384(value: string) {
  return createHash("sha384").update(value, "utf8").digest("hex");
}

export function createP24RegistrationSign(input: {
  sessionId: string;
  merchantId: number;
  amount: number;
  currency: string;
  crc: string;
}) {
  return sha384(JSON.stringify({
    sessionId: input.sessionId,
    merchantId: input.merchantId,
    amount: input.amount,
    currency: input.currency,
    crc: input.crc,
  }));
}

export function createP24VerificationSign(input: {
  sessionId: string;
  orderId: number;
  amount: number;
  currency: string;
  crc: string;
}) {
  return sha384(JSON.stringify({
    sessionId: input.sessionId,
    orderId: input.orderId,
    amount: input.amount,
    currency: input.currency,
    crc: input.crc,
  }));
}

export function createP24NotificationSign(input: {
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  originAmount: number;
  currency: string;
  orderId: number;
  methodId: number;
  statement: string;
  crc: string;
}) {
  return sha384(JSON.stringify({
    merchantId: input.merchantId,
    posId: input.posId,
    sessionId: input.sessionId,
    amount: input.amount,
    originAmount: input.originAmount,
    currency: input.currency,
    orderId: input.orderId,
    methodId: input.methodId,
    statement: input.statement,
    crc: input.crc,
  }));
}

export function safeP24SignEqual(actual: unknown, expected: string) {
  const actualBuffer = Buffer.from(String(actual || ""), "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer);
}

function getP24Authorization(config: P24Config) {
  assertRealP24Credentials(config);
  return `Basic ${Buffer.from(`${config.posId}:${config.apiKey}`).toString("base64")}`;
}

async function readP24Response(response: Response) {
  const result = await response.json().catch(() => null);
  if (!response.ok || Number(result?.responseCode) !== 0) {
    const message = result?.error || result?.data?.error || result?.message;
    throw new Error(message || `Przelewy24 API error (${response.status}).`);
  }
  return result;
}

export async function registerP24Transaction(input: {
  sessionId: string;
  amount: number;
  currency: string;
  description: string;
  email: string;
  client: string;
  country?: string;
  language?: string;
  urlReturn: string;
  urlStatus: string;
}) {
  const config = getP24Config();
  assertRealP24Credentials(config);
  const merchantId = Number(config.merchantId);
  const posId = Number(config.posId);
  const currency = input.currency.toUpperCase();
  const body = {
    merchantId,
    posId,
    sessionId: input.sessionId,
    amount: input.amount,
    currency,
    description: input.description.slice(0, 1024),
    email: input.email.slice(0, 50),
    client: input.client.slice(0, 40),
    country: input.country || "PL",
    language: input.language === "en" ? "en" : "pl",
    urlReturn: input.urlReturn,
    urlStatus: input.urlStatus,
    waitForResult: true,
    sign: createP24RegistrationSign({
      sessionId: input.sessionId,
      merchantId,
      amount: input.amount,
      currency,
      crc: config.crc!,
    }),
  };
  const response = await fetch(`${config.apiBaseUrl}/api/v1/transaction/register`, {
    method: "POST",
    headers: {
      Authorization: getP24Authorization(config),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = await readP24Response(response);
  const token = String(result?.data?.token || "").trim();
  if (!token) throw new Error("Przelewy24 did not return a transaction token.");

  return {
    token,
    paymentUrl: `${config.apiBaseUrl}/trnRequest/${encodeURIComponent(token)}`,
  };
}

export async function verifyP24Transaction(input: {
  sessionId: string;
  orderId: number;
  amount: number;
  currency: string;
}) {
  const config = getP24Config();
  assertRealP24Credentials(config);
  const merchantId = Number(config.merchantId);
  const posId = Number(config.posId);
  const currency = input.currency.toUpperCase();
  const response = await fetch(`${config.apiBaseUrl}/api/v1/transaction/verify`, {
    method: "PUT",
    headers: {
      Authorization: getP24Authorization(config),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      merchantId,
      posId,
      sessionId: input.sessionId,
      amount: input.amount,
      currency,
      orderId: input.orderId,
      sign: createP24VerificationSign({
        sessionId: input.sessionId,
        orderId: input.orderId,
        amount: input.amount,
        currency,
        crc: config.crc!,
      }),
    }),
    cache: "no-store",
  });
  await readP24Response(response);
}

export function createP24DemoSession(input: {
  baseUrl: string;
  publicCode: string;
}) {
  const sessionId = randomUUID();

  return {
    sessionId,
    paymentPageUrl: `${input.baseUrl}/platnosc/${encodeURIComponent(
      input.publicCode
    )}`,
  };
}
