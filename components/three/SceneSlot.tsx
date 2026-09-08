"use client";

import dynamic from "next/dynamic";
import type { SceneId } from "@/lib/chapters";
import { useEffectsEnabled } from "@/components/EffectsProvider";
import type { SceneMode } from "./scenes";

/**
 * Gate in front of every Three.js region.
 *
 * This is the ONLY component the rest of the app imports for scenes. It renders
 * nothing while the visual effects are off, and because <SceneFrame> is pulled
 * in with next/dynamic, three and @react-three/fiber are not merely unused in
 * that case — they are never downloaded. Flipping the toggle loads them then.
 */
const SceneFrame = dynamic(() => import("./SceneFrame"), { ssr: false });

export default function SceneSlot({
  sceneId,
  mode,
}: {
  sceneId: SceneId;
  mode: SceneMode;
}) {
  const { effects } = useEffectsEnabled();
  if (!effects) return null;
  return (
    <SceneFrame
      sceneId={sceneId}
      mode={mode}
    />
  );
}
