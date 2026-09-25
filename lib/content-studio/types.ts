export const BLOCK_TYPES = [
  "text", "eyebrow", "headline", "full-width-image", "full-bleed-image",
  "portrait-image", "landscape-image", "image-text", "text-image", "two-images",
  "three-images", "editorial-grid", "horizontal-gallery", "carousel", "quote", "video",
  "cottage-card", "package-card", "booking-cta", "experience-card", "kanzan-card",
  "amenities", "related-stay",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];
export type ContentStatus = "draft" | "review" | "scheduled" | "published";

export type StudioBlock = {
  id: string;
  type: BlockType;
  content: Record<string, unknown>;
  settings: {
    width: "narrow" | "content" | "wide" | "full";
    alignment: "left" | "center" | "right";
    spacing: "none" | "small" | "medium" | "large" | "xlarge";
    background: "white" | "sand" | "ink" | "transparent";
    mediaRatio: "natural" | "portrait" | "landscape" | "square" | "cinematic";
    sectionHeight: "auto" | "screen" | "half-screen";
    objectFit: "contain" | "cover";
    hideDesktop: boolean;
    hideMobile: boolean;
  };
};

const BLOCK_CONTENT_DEFAULTS: Record<BlockType, Record<string, unknown>> = {
  text: { text: "" },
  eyebrow: { text: "" },
  headline: { text: "" },
  "full-width-image": { mediaIds: [], text: "" },
  "full-bleed-image": { mediaIds: [], text: "" },
  "portrait-image": { mediaIds: [], text: "" },
  "landscape-image": { mediaIds: [], text: "" },
  "image-text": { mediaIds: [], title: "", text: "" },
  "text-image": { mediaIds: [], title: "", text: "" },
  "two-images": { mediaIds: [], text: "" },
  "three-images": { mediaIds: [], text: "" },
  "editorial-grid": { mediaIds: [], text: "" },
  "horizontal-gallery": { mediaIds: [], text: "" },
  carousel: { mediaIds: [], text: "" },
  quote: { text: "" },
  video: { mediaIds: [], text: "" },
  "cottage-card": { mediaIds: [], title: "Domek TOKAMA", text: "", href: "/domki" },
  "package-card": { mediaIds: [], title: "Pakiet TOKAMA", text: "", href: "/pakiety" },
  "booking-cta": { title: "Zatrzymaj się w TOKAMIE.", text: "", href: "/rezerwacja", ctaLabel: "Sprawdź dostępność" },
  "experience-card": { mediaIds: [], title: "Doświadczenie TOKAMA", text: "", href: "/atrakcje" },
  "kanzan-card": { mediaIds: [], title: "KANZAN", text: "", href: "" },
  amenities: { title: "Udogodnienia", text: "" },
  "related-stay": { mediaIds: [], title: "Zostań trochę dłużej.", text: "", href: "/rezerwacja" },
};

export function createBlock(type: BlockType): StudioBlock {
  return {
    id: crypto.randomUUID(),
    type,
    content: { ...BLOCK_CONTENT_DEFAULTS[type] },
    settings: {
      width: type === "full-bleed-image" ? "full" : "content",
      alignment: "left",
      spacing: "medium",
      background: "white",
      mediaRatio: "natural",
      sectionHeight: "auto",
      objectFit: type === "full-bleed-image" ? "cover" : "contain",
      hideDesktop: false,
      hideMobile: false,
    },
  };
}
