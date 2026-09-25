"use client";

import { FormEvent, useState } from "react";
import styles from "./TokamaOnsiteAccess.module.css";

type Props = {
  houseCode: string;
};

export function TokamaOnsiteAccess({ houseCode }: Props) {
  const [reservationCode, setReservationCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/tokama-onsite/access", {
      credentials: "include",
      cache: "no-store",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ house: houseCode, reservationCode }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setStatus("error");
        setMessage(result?.message || "Nie udało się zweryfikować pobytu.");
        return;
      }

      setStatus("success");
      setMessage("Dostęp potwierdzony. Otwieramy Twój pobyt…");

      window.setTimeout(() => {
        window.location.assign(`/pobyt/${houseCode.toLowerCase()}/panel`);
      }, 420);
    } catch {
      setStatus("error");
      setMessage("Nie udało się połączyć z serwerem. Spróbuj ponownie.");
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.access}>
        <div className={styles.content}>
          <p className={styles.kicker}>TOKAMA · {houseCode}</p>

          {status === "success" ? (
            <div className={styles.success}>
              <h1>Witaj w <em>TOKAMA.</em></h1>
              <p>{message}</p>
            </div>
          ) : (
            <>
              <h1>Twój pobyt<br />w domku <em>{houseCode}.</em></h1>
              <p className={styles.intro}>
                Aby przejść dalej, wpisz numer swojej rezerwacji.
              </p>

              <form className={styles.form} onSubmit={handleSubmit}>
                <label>
                  <span>Numer rezerwacji</span>
                  <input
                    value={reservationCode}
                    onChange={(event) => setReservationCode(event.target.value.toUpperCase())}
                    autoComplete="off"
                    autoCapitalize="characters"
                    required
                  />
                </label>

                <button type="submit" disabled={status === "loading"}>
                  {status === "loading" ? "Sprawdzanie…" : "Przejdź dalej"}
                </button>

                {status === "error" ? <p className={styles.error}>{message}</p> : null}
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
