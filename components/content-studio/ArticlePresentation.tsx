import Image from "next/image";
import { ArticleRenderer, type ArticleRendererEditor, type ArticleRendererMedia } from "./ArticleRenderer";
import type { StudioBlock } from "@/lib/content-studio/types";
import { formatJournalPublicationDate, getArticleTableOfContents, withAutomaticBookingCta } from "@/lib/content-studio/journal";
import { ArticleTableOfContents } from "./ArticleTableOfContents";
import styles from "./ArticlePresentation.module.css";

type ArticlePresentationProps = {
  title: string;
  eyebrow?: string;
  excerpt?: string;
  author?: string;
  publishedAt?: string | null;
  coverMediaId?: string | null;
  coverAlt?: string;
  blocks: StudioBlock[];
  media: ArticleRendererMedia[];
  editor?: ArticleRendererEditor;
};

export function ArticlePresentation({ title, eyebrow, excerpt, author, publishedAt, coverMediaId, coverAlt, blocks, media, editor }: ArticlePresentationProps) {
  const cover = coverMediaId ? media.find(asset => asset.id === coverMediaId) : null;
  const publicationDate = formatJournalPublicationDate(publishedAt);
  const tableOfContents = getArticleTableOfContents(blocks);
  const renderedBlocks = editor ? blocks : withAutomaticBookingCta(blocks);

  return <article className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{eyebrow || "TOKAMA JOURNAL"}</p>
        <h1>{title}</h1>
        {author || publicationDate ? <p className={styles.meta}>
          {author ? <span>Autor · {author}</span> : null}
          {author && publicationDate ? <span aria-hidden="true">•</span> : null}
          {publicationDate ? <time dateTime={publishedAt || undefined}>{publicationDate}</time> : null}
        </p> : null}
        {excerpt ? <p className={styles.lead}>{excerpt}</p> : null}
      </div>
      {cover ? <figure className={styles.cover}>
        {cover.kind === "video" ? (
          <video src={cover.public_url} controls playsInline preload="metadata" />
        ) : (
          <Image
            src={cover.public_url}
            alt={coverAlt || cover.alt_text || title}
            width={cover.width || 1800}
            height={cover.height || 1200}
            sizes="100vw"
            priority={!editor}
          />
        )}
      </figure> : null}
    </header>
    <ArticleTableOfContents entries={tableOfContents} />
    <ArticleRenderer blocks={renderedBlocks} media={media} editor={editor} />
  </article>;
}
