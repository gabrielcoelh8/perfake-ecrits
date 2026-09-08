import styles from "./PlaceholderCard.module.css";

/**
 * Provisional slot in the home grid: a chapter still to be written. Shows only
 * the kanji numeral of its future position and a skeleton bar where the title
 * will go. Dimmed, not clickable, not focusable.
 */
export default function PlaceholderCard({ kanji }: { kanji: string }) {
  return (
    <div
      className={styles.card}
      aria-hidden="true"
    >
      <span className={styles.kanji}>{kanji}</span>
      <span className={styles.skeleton} />
    </div>
  );
}
