import Link from "next/link";
import { PLACEHOLDERS } from "@/lib/chapters";
import { BOOKS } from "@/lib/books";
import ChapterCard from "@/components/ChapterCard";
import PlaceholderCard from "@/components/PlaceholderCard";
import styles from "./page.module.css";

export default function Home() {
  // The home page is the current book's front page.
  const book = BOOKS[0];

  return (
    <div className={styles.wrap}>
      <header className={styles.intro}>
        <h1 className={styles.book}>{book.title}</h1>
        <p className={styles.sub}>
          uma sinfonia em {book.chapters.length + PLACEHOLDERS.length} movimentos —{" "}
          {book.coverPath && (
            <Link href={book.coverPath} className={styles.prefLink}>
              prefácio
            </Link>
          )}
        </p>
      </header>

      <section className={styles.grid} aria-label="Capítulos">
        {/* Capítulos e caixas provisórias (título e conceito a definir),
            intercalados pela posição. */}
        {[
          ...book.chapters.map((chapter) => ({ num: chapter.num, node: <ChapterCard key={chapter.slug} chapter={chapter} /> })),
          ...PLACEHOLDERS.map((p) => ({ num: p.num, node: <PlaceholderCard key={p.id} kanji={p.kanji} /> })),
        ]
          .sort((a, b) => a.num - b.num)
          .map((item) => item.node)}
      </section>

      <footer className={styles.footer}>Gabriel R. A. Coelho, 2026</footer>
    </div>
  );
}
