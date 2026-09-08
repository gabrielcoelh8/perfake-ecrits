"use client";

import { BOOKS } from "@/lib/books";
import { APOIE_ENABLED, APOIE_URL, SITE_TITLE } from "@/lib/constants";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import EffectsToggle from "./EffectsToggle";
import styles from "./NavBar.module.css";

/**
 * Are.na-style header: plain text, no boxes, no animation.
 * "Chor Sinfonie / Início · Livros · Apoie" — active item white, others muted.
 * "Livros" opens a bordered dropdown listing each book from lib/books.ts with
 * its cover and chapters, so a second book needs no change here.
 * The icon on the far right toggles the optional visual effects.
 */
export default function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const booksRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (booksRef.current && !booksRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isHome = pathname === "/";
  const inBooks = BOOKS.some((b) => pathname.startsWith(b.basePath));

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link
          href="/"
          className={styles.brand}
        >
          {SITE_TITLE}
        </Link>
        <span className={styles.sep}>/</span>

        <Link
          href="/"
          className={isHome ? styles.active : styles.item}
        >
          Início
        </Link>
        <span className={styles.dot}>·</span>

        <div
          className={styles.booksWrap}
          ref={booksRef}
        >
          <button
            type="button"
            className={inBooks ? styles.active : styles.item}
            aria-haspopup="true"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            Livros
          </button>
          {open && (
            <ul className={styles.dropdown}>
              {BOOKS.map((book) => (
                <li
                  key={book.slug}
                  className={styles.bookGroup}
                >
                  <span className={styles.bookTitle}>{book.title}</span>
                  <ul className={styles.bookChapters}>
                    {book.coverPath && (
                      <li>
                        <Link
                          href={book.coverPath}
                          onClick={() => setOpen(false)}
                        >
                          Cover
                        </Link>
                      </li>
                    )}
                    {book.chapters.map((c) => (
                      <li key={c.slug}>
                        <Link
                          href={`${book.basePath}/${c.slug}`}
                          onClick={() => setOpen(false)}
                        >
                          {c.num}. {c.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
        <span className={styles.dot}>·</span>

        {APOIE_ENABLED ? (
          <a
            href={APOIE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.item}
          >
            Apoie
          </a>
        ) : (
          <span
            className={styles.disabled}
            aria-disabled="true"
            title="Em breve"
          >
            Apoie
          </span>
        )}

        <EffectsToggle />
      </nav>
    </header>
  );
}
