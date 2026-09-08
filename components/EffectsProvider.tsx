"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * Opt-in visual effects.
 *
 * The default reading experience is bare: no WebGL, no textures, no blur —
 * plain Times New Roman. Everything decorative is gated behind this flag,
 * flipped by the icon button in the top right of the NavBar.
 *
 * The choice lives in localStorage and is read through useSyncExternalStore, so
 * every component sees the same value without prop drilling and the server
 * snapshot is always "off" (matching the static HTML). `data-fx="on" | "off"`
 * is mirrored onto <html> so plain CSS can react to it too.
 */

const STORAGE_KEY = "fx";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Keep other tabs in sync.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    // Storage blocked (private mode, etc.) — stay with the default.
    return false;
  }
}

function write(next: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  } catch {
    // Non-fatal: the toggle still works for this session.
  }
  listeners.forEach((l) => l());
}

/** Server and first-paint snapshot: effects are always off until proven on. */
function getServerSnapshot() {
  return false;
}

export function useEffectsEnabled() {
  const effects = useSyncExternalStore(subscribe, read, getServerSnapshot);
  const toggle = useCallback(() => write(!read()), []);
  return { effects, toggle };
}

export default function EffectsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { effects } = useEffectsEnabled();

  // Mirror the flag onto <html> for CSS.
  useEffect(() => {
    document.documentElement.dataset.fx = effects ? "on" : "off";
  }, [effects]);

  return <>{children}</>;
}
