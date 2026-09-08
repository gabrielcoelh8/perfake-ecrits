/**
 * Registry of books.
 *
 * The nav reads from here, not from a hardcoded "Chor Sinfonie": adding a
 * second book means appending an entry (plus its content folder and route),
 * with no component change.
 */

import { CHAPTERS, type Chapter } from "./chapters";

export type Book = {
  slug: string;
  title: string;
  /** Route prefix for this book's pages, e.g. "/chor". */
  basePath: string;
  chapters: Chapter[];
  /** Optional cover / preface page. */
  coverPath?: string;
};

export const BOOKS: Book[] = [
  {
    slug: "chor",
    title: "Chor Sinfonie",
    basePath: "/chor",
    chapters: CHAPTERS,
    coverPath: "/chor/prefacio",
  },
];

export function getBook(slug: string): Book | undefined {
  return BOOKS.find((b) => b.slug === slug);
}

/** The book whose pages the given pathname belongs to, if any. */
export function getBookByPath(pathname: string): Book | undefined {
  return BOOKS.find((b) => pathname.startsWith(b.basePath));
}
