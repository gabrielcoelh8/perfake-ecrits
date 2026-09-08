"use client";

import Link from "next/link";
import type { Chapter } from "@/lib/chapters";
import { useEffectsEnabled } from "@/components/EffectsProvider";
import LiquidTitle from "@/components/LiquidTitle";
import styles from "@/app/chor/[slug]/chapter.module.css";

/**
 * The reading column of a chapter page.
 *
 * Client-side only because the frosted-glass panel depends on the visual
 * effects flag: without effects there is no moving background to sit on, so the
 * column is a plain panel. Markdown is still rendered on the server and handed
 * over as HTML.
 */
export default function ChapterArticle({
  chapter,
  html,
  prev,
  next,
}: {
  chapter: Chapter;
  html: string;
  prev?: Chapter;
  next?: Chapter;
}) {
  const { effects } = useEffectsEnabled();
  const panel = effects && chapter.hasBackground ? styles.glass : styles.plain;

  return (
    <article
      className={`${styles.article} ${panel}`}
      style={{ ["--dropcap" as string]: chapter.accent }}
    >
      <p className={styles.kicker}>
        <span className={styles.kanji}>{chapter.kanji}</span> capítulo{" "}
        {chapter.num}
      </p>

      {chapter.slug === "agua" ? (
        <LiquidTitle>{chapter.title}</LiquidTitle>
      ) : (
        <h1 className={styles.title}>{chapter.title}</h1>
      )}

      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <nav className={styles.pager}>
        {prev ? (
          <Link href={`/chor/${prev.slug}`} className={styles.pagerLink}>
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/chor/${next.slug}`} className={styles.pagerLink}>
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
