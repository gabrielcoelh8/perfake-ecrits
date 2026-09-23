"use client";

/**
 * Construção — the glass curtain wall of a skyscraper, a window cleaner on it.
 *
 * Main: looking up at a tower of blue glass panels (the facade narrows toward
 * the top for a hint of perspective). Each panel reflects the drifting clouds
 * at a slightly different tilt, so the reflection breaks panel by panel; a few
 * windows glow warm from inside. A window cleaner's gondola hangs from two
 * ropes, slowly descending, the squeegee sweeping side to side.
 *
 * Background: the same facade, darker and larger, the reflections slow — it
 * sits behind the reading column as a dim, moving wall of glass.
 *
 * Uniforms: u_time, u_res, u_cols (panel density), u_dim (0 cover, 1 background).
 */

import { useMemo } from "react";
import * as THREE from "three";
import ShaderQuad from "../ShaderQuad";
import { NOISE_GLSL } from "../shaders/noise";

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float u_time;
uniform vec2 u_res;
uniform float u_cols;
uniform float u_dim;
${NOISE_GLSL}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  // Facade narrows toward the top (looking up).
  vec2 uv = vUv;
  float persp = mix(1.0, 1.0 + 0.25 / max(aspect, 1.0), uv.y) * mix(1.0, 0.6, u_dim);
  uv.x = (uv.x - 0.5) * persp * aspect;

  // Panels: u_cols across the width, taller than wide.
  float pw = aspect / u_cols;
  vec2 grid = vec2(1.0 / pw, 1.0 / (pw * 1.4));
  vec2 cell = vec2(uv.x, vUv.y) * grid;
  vec2 id = floor(cell);
  vec2 f = fract(cell);
  float seed = hash(id);

  // Panel reflection: sky + clouds, each panel tilted a little differently.
  vec2 tilt = (vec2(hash(id + 3.0), hash(id + 5.0)) - 0.5) * vec2(0.25, 0.08);
  vec2 r = vec2(uv.x, vUv.y) + tilt + f * 0.02;
  float t = u_time * mix(0.02, 0.008, u_dim);
  float clouds = fbm(vec2(r.x * 1.6 + t, r.y * 3.0));
  clouds = smoothstep(-0.1, 0.6, clouds);
  vec3 sky = mix(vec3(0.03, 0.09, 0.22), vec3(0.16, 0.28, 0.46), vUv.y);
  vec3 glass = mix(sky, vec3(0.70, 0.78, 0.86), clouds * 0.55);
  // Glass is darker toward the panel bottom (angle of view).
  glass *= 0.75 + 0.25 * f.y;

  // A few windows lit from inside, warm, behind the reflection.
  float lit = step(0.86, seed) * (0.6 + 0.4 * sin(u_time * 0.2 + seed * 30.0));
  glass = mix(glass, vec3(0.95, 0.72, 0.38), lit * 0.45);

  // Mullions: thin pale metal frame around each panel.
  float edge = min(min(f.x, 1.0 - f.x) / grid.x, min(f.y, 1.0 - f.y) / grid.y);
  float frame = 1.0 - smoothstep(0.004, 0.008, edge);
  vec3 col = mix(glass, vec3(0.55, 0.60, 0.66), frame * 0.8);

  // Window cleaner's gondola: descends slowly, hangs from two ropes.
  float gy = 1.05 - fract(u_time * 0.015 + 0.3) * 1.2;
  float gw = 0.10 * mix(1.0, 1.8, u_dim);
  float gx = mix(0.0, aspect * 0.28, u_dim);
  vec2 g = vec2(uv.x - gx, vUv.y - gy);
  float rope = (smoothstep(0.004, 0.0, abs(abs(g.x) - gw * 0.9))) * step(0.0, g.y);
  float platform = step(abs(g.x), gw) * step(abs(g.y + 0.012), 0.012);
  float rail = step(abs(g.x), gw) * smoothstep(0.003, 0.0, abs(g.y - 0.03)) + step(abs(abs(g.x) - gw), 0.003) * step(0.0, g.y) * step(g.y, 0.03);
  // The cleaner: head + body, arm sweeping a squeegee.
  vec2 bp = g - vec2(-gw * 0.3, 0.035);
  float body = smoothstep(0.004, 0.0, length(bp * vec2(1.8, 1.0)) - 0.03);
  float head = smoothstep(0.004, 0.0, length(bp - vec2(0.0, 0.045)) - 0.012);
  float sweep = sin(u_time * 1.5) * 0.04;
  vec2 arm = bp - vec2(0.02, 0.02);
  vec2 armDir = normalize(vec2(0.05 + sweep, 0.04));
  float armLen = clamp(dot(arm, armDir), 0.0, 0.07);
  float armD = length(arm - armDir * armLen);
  float squeegee = smoothstep(0.004, 0.0, armD - 0.004);
  float figure = max(max(body, head), squeegee);
  col = mix(col, vec3(0.02, 0.025, 0.03), max(max(rope * 0.9, max(platform, rail)), figure) * step(0.0, gy + 0.2));

  // Dim for the background.
  col *= mix(1.0, 0.3, u_dim);
  col *= 1.0 - 0.6 * smoothstep(0.35, 0.8, length(vUv - 0.5));
  gl_FragColor = vec4(col, 1.0);
}
`;

export function Main({ mode }: { mode: "cover" | "banner" }) {
  const uniforms = useMemo(
    () => ({ u_cols: { value: mode === "banner" ? 16 : 5 }, u_dim: { value: 0 } }),
    [mode],
  );
  return <ShaderQuad fragment={FRAG} uniforms={uniforms} speed={1} />;
}

export function Background() {
  const uniforms = useMemo<Record<string, THREE.IUniform>>(
    () => ({ u_cols: { value: 7 }, u_dim: { value: 1 } }),
    [],
  );
  return <ShaderQuad fragment={FRAG} uniforms={uniforms} speed={1} />;
}
