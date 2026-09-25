"use client";

import { ReactNode, useEffect } from "react";

export function ScrollRevealProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const revealVisibleElements = () => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
      const triggerPoint = window.innerHeight * 0.88;

      elements.forEach((element) => {
        if (element.classList.contains("is-visible")) return;

        const rect = element.getBoundingClientRect();
        const isInView = rect.top < triggerPoint && rect.bottom > 0;

        if (isInView) {
          const delay = element.dataset.delay || "0";
          element.style.transitionDelay = `${delay}ms`;
          element.classList.add("is-visible");
        }
      });
    };

    revealVisibleElements();

    window.addEventListener("scroll", revealVisibleElements, { passive: true });
    window.addEventListener("resize", revealVisibleElements);

    const interval = window.setInterval(revealVisibleElements, 250);

    return () => {
      window.removeEventListener("scroll", revealVisibleElements);
      window.removeEventListener("resize", revealVisibleElements);
      window.clearInterval(interval);
    };
  }, []);

  return <>{children}</>;
}
