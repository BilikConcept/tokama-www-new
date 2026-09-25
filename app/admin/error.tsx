"use client";

import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("TOKAMA Content Studio error", error); }, [error]);

  return <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 24, background: "#f7f7f6", color: "#050505", fontFamily: "Arial, sans-serif" }}>
    <section style={{ width: "min(720px, 100%)", padding: "clamp(28px, 6vw, 64px)", border: "1px solid #e9e9e7", borderRadius: 36, background: "#fff" }}>
      <p style={{ margin: "0 0 24px", color: "#999", fontSize: 10, letterSpacing: ".28em" }}>TOKAMA CONTENT STUDIO</p>
      <h1 style={{ margin: 0, fontSize: "clamp(48px, 8vw, 88px)", fontWeight: 500, lineHeight: .88, letterSpacing: "-.085em" }}>Studio na chwilę<br />straciło rytm.</h1>
      <p style={{ maxWidth: 520, margin: "28px 0", color: "#666", lineHeight: 1.6 }}>Twoje dane są bezpieczne. Spróbuj ponownie — jeśli problem wróci, dashboard pokaże, który moduł wymaga uwagi.</p>
      <button onClick={reset} style={{ minHeight: 46, padding: "0 20px", border: 0, borderRadius: 999, background: "#050505", color: "#fff", cursor: "pointer" }}>Spróbuj ponownie</button>
    </section>
  </main>;
}
