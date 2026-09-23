"use client";

/**
 * Cidade — a bleeding-tooth mushroom (Hydnellum peckii) in chimney smoke.
 *
 * Main: a lumpy pale cap (noise-warped ellipse dome) over a flared stem, with
 * a band of brown "teeth" on the underside. Red droplets hashed across the cap
 * swell and shrink on their own phase, each with a small specular highlight.
 * Behind it, dark fbm smoke drifts upward.
 *
 * Background: the chimney smoke alone — dark fbm billowing upward over
 * near-black, with sparse faint red spores rising through it.
 *
 * Uniforms: u_time, u_res.
 */

import { useMemo } from "react";
import ShaderQuad from "../ShaderQuad";
import { NOISE_GLSL } from "../shaders/noise";

const MAIN_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float u_time;
uniform vec2 u_res;
${NOISE_GLSL}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);

  // Smoke behind the mushroom, drifting upward.
  float smoke = fbm(uv * 2.5 + vec2(0.0, -u_time * 0.08));
  vec3 col = mix(vec3(0.02, 0.02, 0.025), vec3(0.11, 0.10, 0.11), smoke * 0.5 + 0.5);

  // Stem: flares toward the base, slight organic wobble.
  vec2 sp = uv - vec2(0.0, -0.20);
  float w = 0.06 + 0.04 * clamp(-sp.y / 0.17, 0.0, 1.0);
  float wob = sin(uv.y * 14.0) * 0.006;
  float stem = smoothstep(0.006, 0.0, abs(sp.x + wob) - w)
             * smoothstep(0.006, 0.0, abs(sp.y) - 0.17);
  vec3 stemCol = mix(vec3(0.36, 0.24, 0.18), vec3(0.62, 0.52, 0.46), sp.x / w * 0.5 + 0.5);
  col = mix(col, stemCol, stem);

  // Cap: lumpy dome with a slightly curved underside.
  vec2 cp = uv - vec2(0.0, -0.02);
  float e = length(cp / vec2(0.36, 0.26)) + snoise(cp * 9.0) * 0.05;
  float under = cp.y + 0.03 + cp.x * cp.x * 0.35;
  float cap = smoothstep(1.0, 0.97, e) * smoothstep(0.0, 0.008, under);
  float lumps = fbm(cp * 6.0);
  vec3 capCol = mix(vec3(0.60, 0.50, 0.50), vec3(0.86, 0.82, 0.78), lumps * 0.5 + 0.5);
  capCol *= mix(0.7, 1.05, clamp(cp.y / 0.26, 0.0, 1.0));  // lit from above
  col = mix(col, capCol, cap);

  // Teeth: short brown spines hanging just under the cap rim.
  float band = step(-0.035, under) * step(under, 0.0) * step(abs(cp.x), 0.33);
  float spikes = step(fract(cp.x * 55.0), 0.5 + under * 12.0);
  col = mix(col, vec3(0.30, 0.18, 0.13), band * spikes);

  // Blood droplets swelling on the cap.
  for (int k = 0; k < 14; k++) {
    float i = float(k);
    vec2 pos = vec2((hash(vec2(i, 1.0)) - 0.5) * 0.56, 0.0 + hash(vec2(i, 2.0)) * 0.22);
    float pulse = 0.5 + 0.5 * sin(u_time * (0.5 + hash(vec2(i, 3.0))) + i * 1.7);
    float r = 0.010 + 0.016 * pulse;
    vec2 d = cp - pos;
    d.y *= 1.15;                                   // a little heavy at the bottom
    float drop = smoothstep(r, r - 0.004, length(d));
    vec3 dropCol = mix(vec3(0.45, 0.01, 0.03), vec3(0.72, 0.05, 0.07), clamp(-d.y / r, 0.0, 1.0));
    float hl = smoothstep(r * 0.35, 0.0, length(d - vec2(-r * 0.35, r * 0.35)));
    dropCol += hl * 0.5;
    col = mix(col, dropCol, drop * cap);
  }

  // Vignette.
  col *= 1.0 - 0.85 * smoothstep(0.3, 0.75, length(vUv - 0.5));
  gl_FragColor = vec4(col, 1.0);
}
`;

const BG_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float u_time;
uniform vec2 u_res;
${NOISE_GLSL}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 uv = vUv * vec2(aspect, 1.0);

  // Billowing smoke rising from below.
  vec2 q = vec2(fbm(uv * 1.5 + vec2(0.0, -u_time * 0.05)), fbm(uv * 1.5 + 4.0));
  float smoke = fbm(uv * 2.0 + q * 1.2 + vec2(0.0, -u_time * 0.07));
  vec3 col = mix(vec3(0.015, 0.014, 0.016), vec3(0.14, 0.13, 0.135), smoothstep(-0.3, 0.7, smoke));

  // Sparse red spores drifting upward.
  vec2 grid = vec2(9.0 * aspect, 9.0);
  vec2 cell = (uv + vec2(0.0, -u_time * 0.02)) * grid;
  vec2 id = floor(cell);
  vec2 f = fract(cell) - 0.5;
  float seed = hash(id);
  if (seed > 0.93) {
    float spore = smoothstep(0.12, 0.02, length(f));
    col += vec3(0.5, 0.03, 0.05) * spore * (0.5 + 0.5 * sin(u_time + seed * 40.0));
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
