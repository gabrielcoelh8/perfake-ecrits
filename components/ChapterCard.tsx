"use client";

import Link from "next/link";
import type { Chapter } from "@/lib/chapters";
import SceneSlot from "@/components/three/SceneSlot";
import { useEffectsEnabled } from "@/components/EffectsProvider";
import styles from "./ChapterCard.module.css";

/**
 * Square Are.na-style card linking to the chapter page.
 *
 * With the visual effects on: the front shows the chapter's animated cover
 * (Three.js) and the card flips (CSS 3D rotateY) on hover/focus to reveal the
 * kanji numeral and title. With effects off there is nothing to hide, so the
 * reading face is shown directly — static, no flip.
 */
export default function ChapterCard({ chapter }: { chapter: Chapter }) {
  const { effects } = useEffectsEnabled();

  const face = (
    <>
      <span className={styles.kanji}>{chapter.kanji}</span>
      <span className={styles.title}>{chapter.title}</span>
      <span className={styles.num}>capítulo {chapter.num}</span>
    </>
  );

  return (
    <Link
      href={`/chor/${chapter.slug}`}
      className={effects ? styles.card : styles.staticCard}
      style={{ ["--accent" as string]: chapter.accent }}
      aria-label={`Capítulo ${chapter.num}: ${chapter.title}`}
    >
      {effects ? (
        <div className={styles.flipper}>
          <div className={styles.front}>
            <SceneSlot sceneId={chapter.sceneId} mode="cover" />
          </div>
          <div className={styles.back}>{face}</div>
        </div>
      ) : (
        <div className={styles.face}>{face}</div>
      )}
    </Link>
  );
}
