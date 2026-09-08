"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { SceneId } from "@/lib/chapters";
import type { SceneMode } from "./scenes";

/**
 * The ONLY place a <Canvas> is created.
 *
 * Never imported directly — reach it through <SceneSlot>, which lazy-loads this
 * module only once the reader has switched the visual effects on.
 *
 * Why one canvas per region (not a shared drei <View>): the home cards flip with
 * a CSS 3D transform. A shared fixed canvas cannot rotate with the card, so each
 * card owns its own small <canvas> inside the transformed DOM.
 *
 * Performance valves for the home page (up to 8 canvases):
 *  - dpr clamped low, antialias off, low-power GPU hint.
 *  - IntersectionObserver: when the wrapper is offscreen we drop frameloop to
 *    "never" so idle cards cost nothing.
 *  - prefers-reduced-motion also pins frameloop to "never" (render one frame).
 *  - Scenes are dynamically imported (ssr:false) so three never hits the server
 *    bundle and only loads client-side.
 */

// Lazy client-only loader for the scene registry.
const SceneRenderer = dynamic(() => import("./SceneRenderer"), { ssr: false });

export default function SceneFrame({
  sceneId,
  mode,
}: {
  sceneId: SceneId;
  mode: SceneMode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  // Pause the render loop while offscreen.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Respect reduced-motion.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const animate = visible && !reduced;

  return (
    <div
      ref={wrapRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "low-power", alpha: false }}
        frameloop={animate ? "always" : "demand"}
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <SceneRenderer sceneId={sceneId} mode={mode} animate={animate} />
      </Canvas>
    </div>
  );
}
