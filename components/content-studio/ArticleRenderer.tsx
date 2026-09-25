import Image from "next/image";
import Link from "next/link";
import type { StudioBlock } from "@/lib/content-studio/types";
import { getArticleTableOfContents } from "@/lib/content-studio/journal";
import styles from "./ArticleRenderer.module.css";

export type ArticleRendererMedia = { id: string; public_url: string; alt_text: string; kind: "image" | "video"; width?: number | null; height?: number | null };
export type ArticleRendererEditor = {
  selectedBlockId?: string | null;
  onSelect: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
};

type RichPart = { text: string; bold?: boolean; italic?: boolean; href?: string };
type RichText = { kind: "paragraph"; parts: RichPart[] } | { kind: "unordered-list" | "ordered-list"; items: RichPart[][] };

function safeRichHref(value?: string) {
  if (!value) return "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

function RichParts({ parts }: { parts: RichPart[] }) {
  return <>{parts.map((part, index) => {
    let node: React.ReactNode = part.text;
    if (part.bold) node = <strong>{node}</strong>;
    if (part.italic) node = <em>{node}</em>;
    const href = safeRichHref(part.href);
    if (href) node = href.startsWith("/") ? <Link href={href}>{node}</Link> : <a href={href} rel="noreferrer">{node}</a>;
    return <span key={index}>{node}</span>;
  })}</>;
}

function isRichText(value: unknown): value is RichText {
  if (!value || typeof value !== "object") return false;
  const kind = (value as { kind?: unknown }).kind;
  return kind === "paragraph" || kind === "unordered-list" || kind === "ordered-list";
}

export function ArticleRenderer({ blocks, media, editor }: { blocks: StudioBlock[]; media: ArticleRendererMedia[]; editor?: ArticleRendererEditor }) {
  const byId = new Map(media.map(asset => [asset.id, asset]));
  const headingIds = new Map(getArticleTableOfContents(blocks).map(entry => [entry.blockId, entry.id]));
  return <div className={styles.story}>{blocks.map((block, index) => {
    const assets = ((block.content.mediaIds as string[]) || []).map(id => byId.get(id)).filter(Boolean) as ArticleRendererMedia[];
    const classes = [styles.block, styles[block.settings.width], styles[block.settings.spacing], styles[block.settings.sectionHeight.replaceAll("-", "_")], styles[block.settings.mediaRatio], styles[block.settings.background], block.settings.hideDesktop ? styles.hideDesktop : "", block.settings.hideMobile ? styles.hideMobile : ""].join(" ");
    const content = String(block.content.text || "");
    const richText = isRichText(block.content.richText) ? block.content.richText : null;
    const title = String(block.content.title || "");
    const href = String(block.content.href || "");
    const ctaLabel = String(block.content.ctaLabel || "Sprawdź dostępność");
    const blockStyle = { textAlign: block.settings.alignment, background: block.settings.background === "sand" ? "#f1eee7" : block.settings.background === "ink" ? "#20211e" : undefined } as const;
    let node: React.ReactNode;

    if (block.type === "booking-cta") node = <section className={`${classes} ${styles.cta}`} style={blockStyle}><h2>{title || "Zatrzymaj się w TOKAMIE."}</h2>{content ? <p>{content}</p> : null}<Link href={href || "/rezerwacja"}>{ctaLabel}</Link></section>;
    else if (block.type === "quote") node = <blockquote className={classes} style={blockStyle}>{content}</blockquote>;
    else if (block.type === "headline") {
      const Heading = Number(block.content.level) === 3 ? "h3" : "h2";
      node = <Heading id={headingIds.get(block.id)} className={classes} style={blockStyle}>{content}</Heading>;
    }
    else if (block.type === "eyebrow") node = <p className={`${classes} ${styles.eyebrow}`} style={blockStyle}>{content}</p>;
    else if (block.type === "text" && richText?.kind === "paragraph") node = <div className={classes} style={blockStyle}><p><RichParts parts={richText.parts} /></p></div>;
    else if (block.type === "text" && richText && richText.kind !== "paragraph") {
      const List = richText.kind === "ordered-list" ? "ol" : "ul";
      node = <div className={classes} style={blockStyle}><List>{richText.items.map((parts, itemIndex) => <li key={`${block.id}-${itemIndex}`}><RichParts parts={parts} /></li>)}</List></div>;
    }
    else if (block.type === "text") node = <div className={classes} style={blockStyle}>{content.split("\n").map((paragraph, paragraphIndex) => <p key={`${block.id}-${paragraphIndex}`}>{paragraph}</p>)}</div>;
    else if (block.type === "amenities") node = <section className={`${classes} ${styles.amenities}`} style={blockStyle}><h2>{title || "Udogodnienia"}</h2><ul>{content.split("\n").filter(Boolean).map((item, itemIndex) => <li key={`${block.id}-${itemIndex}`}>{item}</li>)}</ul></section>;
    else if (["cottage-card", "package-card", "experience-card", "kanzan-card", "related-stay"].includes(block.type)) node = <section className={`${classes} ${styles.editorialCard}`} style={blockStyle}>
      {assets[0] ? assets[0].kind === "video" ? <video src={assets[0].public_url} controls playsInline /> : <Image src={assets[0].public_url} alt={assets[0].alt_text} width={assets[0].width || 1800} height={assets[0].height || 1200} sizes="(max-width: 768px) 100vw, 65vw" /> : null}
      <div><p className={styles.cardEyebrow}>{block.type.replaceAll("-", " ")}</p><h2>{title}</h2>{content ? <p>{content}</p> : null}{href ? <Link href={href}>Zobacz więcej →</Link> : null}</div>
    </section>;
    else node = <section className={`${classes} ${styles.mediaBlock} ${styles[block.type.replaceAll("-", "_")] || ""}`} style={blockStyle}>
      {assets.map(asset => asset.kind === "video" ? <video key={asset.id} src={asset.public_url} controls playsInline /> : <Image key={asset.id} src={asset.public_url} alt={asset.alt_text} width={asset.width || 1800} height={asset.height || 1200} sizes="(max-width: 768px) 100vw, 90vw" style={{ objectFit: block.settings.objectFit }} />)}
      {content ? <div className={styles.copy}>{content}</div> : null}
    </section>;

    if (!editor) return <div className={styles.publicBlock} key={block.id}>{node}</div>;
    return <div
      key={block.id}
      draggable
      className={`${styles.editableBlock} ${editor.selectedBlockId === block.id ? styles.editableBlockSelected : ""}`}
      onClick={() => editor.onSelect(block.id)}
      onDragStart={event => event.dataTransfer.setData("index", String(index))}
      onDragOver={event => event.preventDefault()}
      onDrop={event => editor.onMove(Number(event.dataTransfer.getData("index")), index)}
    >
      {node}
      <span className={styles.editorBadge}>Edytuj · przeciągnij</span>
      <button type="button" aria-label="Usuń blok" onClick={event => { event.stopPropagation(); editor.onRemove(block.id); }}>×</button>
    </div>;
  })}</div>;
}
