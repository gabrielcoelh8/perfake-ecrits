"use client";

/**
 * Triângulo — a triangle full of yellow eyes.
 *
 * Main: a black triangle, backlit by a pale overexposed sun, packed with rows
 * of almond-shaped yellow cat eyes (hex-offset grid clipped to the triangle).
 * Each eye blinks on its own rhythm; every few seconds all the slit pupils
 * glance to the same side at once.
 *
 * Background: pairs of cat eyes opening in the dark — sparse, slowly fading in
 * and out, blinking now and then.
 *
 * Uniforms: u_time, u_res.
 */

import { useMemo } from "react";
import ShaderQuad from "../ShaderQuad";
import { NOISE_GLSL } from "../shaders/noise";

// Shared GLSL: one almond cat eye at local p (width ~[-0.45, 0.45]).
// `open` 0..1 is the eyelid, `look` shifts the slit pupil sideways.
// Returns rgb in .rgb and coverage in .a.
const EYE_GLSL = /* glsl */ `
vec4 catEye(vec2 p, float open, float look) {
  const float W = 0.45;
  float xn = clamp(p.x / W, -1.0, 1.0);
  float lim = open * 0.24 * (1.0 - xn * xn);            // almond outline
  float d = abs(p.y) - lim;
  float inside = smoothstep(0.012, -0.004, d) * step(abs(p.x), W);
  if (inside <= 0.0) return vec4(0.0);

  // Iris: hot yellow center to amber rim, with fine radial streaks.
  vec2 q = p - vec2(look, 0.0);
  float r = length(q);
  float streak = sin(atan(q.y, q.x) * 28.0) * 0.5 + 0.5;
  vec3 col = mix(vec3(1.0, 0.86, 0.22), vec3(0.62, 0.36, 0.03), smoothstep(0.02, 0.30, r));
  col *= 0.88 + 0.12 * streak;

  // Vertical slit pupil.
  float pw = 0.045 * sqrt(max(0.0, 1.0 - (q.y * q.y) / 0.05));
  col = mix(col, vec3(0.01), smoothstep(0.006, -0.004, abs(q.x) - pw));

  // Lid shadow along the edge + a wet glint.
  col *= smoothstep(0.0, -0.05, d) * 0.6 + 0.4;
  col += vec3(1.0) * smoothstep(0.035, 0.0, length(p - vec2(-0.10 + look * 0.3, 0.06))) * open;
  return vec4(col, inside);
}

// Mostly open, with a quick blink now and then.
float blinkOpen(float t, float seed) {
  float s = sin(t * (0.35 + seed * 0.4) + seed * 40.0);
  return 1.0 - pow(max(s, 0.0), 60.0);
}
`;

const MAIN_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float u_time;
uniform vec2 u_res;
${NOISE_GLSL}
${EYE_GLSL}

// Signed distance to an equilateral triangle (centered), negative inside.
float sdTriangle(vec2 p, float r) {
  const float k = 1.7320508; // sqrt(3)
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);
  uv.y += 0.04;

  // Overexposed pale sun behind the triangle.
  float halo = exp(-length(uv - vec2(0.0, 0.05)) * 3.2);
  vec3 col = mix(vec3(0.015, 0.012, 0.01), vec3(0.95, 0.92, 0.82), halo * 0.85);

  float tri = sdTriangle(uv, 0.40);
  float inside = smoothstep(0.004, -0.004, tri);

  // Triangle body: black with a faint fur grain.
  vec3 body = vec3(0.012) + fbm(uv * vec2(40.0, 8.0)) * 0.012;
  col = mix(col, body, inside);

  // Eyes on a hex-offset grid, only where the whole cell sits inside.
  vec2 g = uv * vec2(5.2, 6.0);
  float row = floor(g.y);
  g.x += mod(row, 2.0) * 0.5;
  vec2 id = vec2(floor(g.x), row);
  vec2 f = fract(g) - 0.5;
  vec2 center = (id + 0.5 - vec2(mod(row, 2.0) * 0.5, 0.0)) / vec2(5.2, 6.0);
  float fits = step(sdTriangle(center, 0.40), -0.07);

  float seed = hash(id);
  // Every eye glances the same way at once, then drifts back.
  float glance = smoothstep(0.6, 0.9, sin(u_time * 0.45)) - smoothstep(0.6, 0.9, sin(u_time * 0.45 + 3.1));
  float look = glance * 0.12 + (seed - 0.5) * 0.03;
  vec4 e = catEye(f * vec2(1.0, 1.15), blinkOpen(u_time, seed), look);
  col = mix(col, e.rgb, e.a * fits * inside);

  // Thin rim where the backlight wraps the edges.
  col += vec3(1.0, 0.85, 0.45) * smoothstep(0.012, 0.0, abs(tri)) * 0.5;

  col *= 1.0 - 0.8 * smoothstep(0.3, 0.75, length(vUv - 0.5));
  gl_FragColor = vec4(col, 1.0);
}
`;

const BG_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float u_time;
uniform vec2 u_res;
${NOISE_GLSL}
${EYE_GLSL}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 uv = vUv * vec2(aspect, 1.0);

  vec3 col = vec3(0.012, 0.011, 0.01);
  vec2 grid = vec2(2.8, 3.2);
  vec2 cell = uv * grid;
  vec2 id = floor(cell);
  vec2 f = fract(cell) - 0.5;
  float seed = hash(id + 7.0);

  // A pair of eyes per chosen cell, fading in and out slowly.
  float presence = smoothstep(0.2, 0.8, sin(u_time * 0.15 + seed * 60.0));
  if (seed > 0.35 && presence > 0.0) {
    vec2 j = (vec2(hash(id + 1.0), hash(id + 2.0)) - 0.5) * vec2(0.06, 0.3);
    vec2 p = (f - j) * 2.4;
    float open = blinkOpen(u_time, seed) * presence;
    float look = sin(u_time * 0.3 + seed * 9.0) * 0.06;
    vec4 l = catEye(p + vec2(0.55, 0.0), open, look);
    vec4 r = catEye(p - vec2(0.55, 0.0), open, look);
    vec4 e = l.a > 0.0 ? l : r;
    col = mix(col, e.rgb * 0.8, e.a * presence);
    // Faint glow around the pair so it survives the frosted panel.
    col += vec3(0.25, 0.16, 0.02) * exp(-length(p * vec2(0.6, 1.4)) * 2.5) * presence * 0.35;
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

export function Main({ mode: _mode }: { mode: "cover" | "banner" }) {
  return <ShaderQuad fragment={MAIN_FRAG} speed={1} />;
}

export function Background() {
  const uniforms = useMemo(() => ({}), []);
  return <ShaderQuad fragment={BG_FRAG} uniforms={uniforms} speed={1} />;
}
