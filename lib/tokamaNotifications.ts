type SendTokamaEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type SendTokamaSmsInput = {
  to: string;
  text: string;
};

export async function sendTokamaEmail(input: SendTokamaEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.TOKAMA_EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or TOKAMA_EMAIL_FROM.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Resend failed: ${response.status} ${JSON.stringify(result)}`);
  }

  return result;
}

function normalizeVonagePhone(phone: string) {
  return phone.replace(/[^0-9]/g, "");
}

export async function sendTokamaSms(input: SendTokamaSmsInput) {
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  const from = process.env.VONAGE_SMS_FROM || "TOKAMA";
  const to = normalizeVonagePhone(input.to);

  if (!apiKey || !apiSecret) {
    throw new Error("Missing VONAGE_API_KEY or VONAGE_API_SECRET.");
  }

  if (!to) {
    throw new Error("Missing SMS recipient.");
  }

  const body = new URLSearchParams({
    api_key: apiKey,
    api_secret: apiSecret,
    from,
    to,
    text: input.text,
    type: "unicode",
  });

  const response = await fetch("https://rest.nexmo.com/sms/json", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const result = await response.json().catch(() => null);

  console.log("[TOKAMA SMS]", JSON.stringify(result, null, 2));

  const message = result?.messages?.[0];

  if (!response.ok || message?.status !== "0") {
    throw new Error(
      `Vonage SMS failed: ${response.status} ${JSON.stringify(result)}`
    );
  }

  return result;
}
