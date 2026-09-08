import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CHAPTERS, getChapter, getAdjacent } from "@/lib/chapters";
import { getChapterHtml } from "@/lib/markdown";
import SceneSlot from "@/components/three/SceneSlot";
import ChapterArticle from "@/components/ChapterArticle";
import styles from "./chapter.module.css";

// Pre-render one static page per chapter (prefácio has its own route).
export function generateStaticParams() {
  return CHAPTERS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const chapter = getChapter(slug);
  if (!chapter) return {};
  return {
    title: `${chapter.title} — Chor Sinfonie`,
    description: `Capítulo ${chapter.num} de Chor Sinfonie.`,
  };
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getChapter(slug);
  if (!chapter) notFound();

  const { html } = await getChapterHtml(chapter.file);
  const { prev, next } = getAdjacent(slug);

  return (
    <div className={styles.page}>
      {/* Scenes render only when the reader turned the visual effects on. */}
      {/* Fixed background scene (skipped for Borboletas). */}
      {chapter.hasBackground && (
        <div className={styles.bg} aria-hidden="true">
          <SceneSlot sceneId={chapter.sceneId} mode="background" />
        </div>
      )}

      {/* Top banner rectangle. */}
      <div className={styles.banner} aria-hidden="true">
        <SceneSlot sceneId={chapter.sceneId} mode="banner" />
      </div>

      <ChapterArticle
        chapter={chapter}
        html={html}
        prev={prev}
        next={next}
      />
    </div>
  );
}
