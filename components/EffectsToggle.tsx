"use client";

import { useEffectsEnabled } from "./EffectsProvider";
import styles from "./EffectsToggle.module.css";

/**
 * Icon-only switch for the visual effects (top right of the header).
 * A droplet: outlined when effects are off, filled when they are on.
 */
export default function EffectsToggle() {
  const { effects, toggle } = useEffectsEnabled();
  const label = effects ? "Desativar efeitos visuais" : "Ativar efeitos visuais";

  return (
    <button
      type="button"
      className={effects ? styles.on : styles.off}
      onClick={toggle}
      aria-pressed={effects}
      aria-label={label}
      title={label}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M8 1.5 C 8 1.5, 13 7, 13 10 A 5 5 0 0 1 3 10 C 3 7, 8 1.5, 8 1.5 Z"
          fill={effects ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    </button>
  );
}
