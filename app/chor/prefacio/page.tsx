import {getChapterHtml} from "@/lib/markdown";
import type {Metadata} from "next";
import styles from "./prefacio.module.css";

export const metadata: Metadata = {
  title: "Prefácio — Chor Sinfonie",
  description: "Prefácio de Chor Sinfonie.",
};

// Simple page, no Three.js scene (per plan).
export default async function PrefacioPage() {
  const {title, html} = await getChapterHtml("prefacio.md");
  const sanitizedHtml = html.replace(/<script.*?>.*?<\/script>/g, ""); // Remove any <script> tags for safety

  return (
    <article className={styles.article}>
      <h1 className={styles.title}>{title || "Prefácio"}</h1>
      <div
        className="prose"
        dangerouslySetInnerHTML={{__html: sanitizedHtml}}
      />
    </article>
  );
}
