const ORIGIN = "https://tokama-www-new.vercel.app";

export function escapeEmailHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" })[character] || character);
}

export function tokamaGuestEmail(input: { eyebrow: string; content: string; preview?: string }) {
  return `<div style="margin:0;padding:32px 12px;background:#f4f2ed;font-family:Arial,sans-serif;color:#111"><div style="display:none;max-height:0;overflow:hidden">${escapeEmailHtml(input.preview || input.eyebrow)}</div><table role="presentation" width="100%" style="max-width:620px;margin:auto;border-collapse:collapse;background:#fff;border:1px solid #e5e2dc"><tr><td style="padding:28px;text-align:center;border-bottom:1px solid #e5e2dc"><img src="${ORIGIN}/tokama-logo.svg" width="142" alt="TOKAMA" style="display:inline-block;border:0;height:auto"><p style="margin:9px 0 0;font-size:9px;letter-spacing:3px;color:#777">${escapeEmailHtml(input.eyebrow)}</p></td></tr><tr><td style="padding:0"><img src="${ORIGIN}/email/tokama-hero.gif" width="620" alt="TOKAMA nad jeziorem" style="display:block;width:100%;height:auto;border:0"></td></tr><tr><td style="padding:42px 34px;text-align:center">${input.content}</td></tr><tr><td style="padding:22px 30px;border-top:1px solid #e5e2dc;text-align:center;color:#777;font-size:11px;line-height:1.6">TOKAMA · Windyki · kontakt@tokama.pl</td></tr></table></div>`;
}
