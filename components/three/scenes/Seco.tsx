"use client";

/**
 * Seco — dry blood, cracked, with fresh blood seeping through.
 *
 * Main: a crust of dried blood broken into plates (Voronoi F1/F2). Each plate
 * is dark maroon-brown with grain and a curled, lighter rim; in the cracks
 * between them fresh wet blood seeps up — glossy, with a moving specular
 * glint — and the cracks slowly widen and narrow as it pulses.
 *
 * Background: rain of black blood — thick dark-red streaks falling at
 * different speeds and depths over near-black, heavy enough to read beside the
 * frosted reading column.
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

// Voronoi: returns (F1, F2 - F1, cell hash).
vec3 voronoi(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float f1 = 8.0, f2 = 8.0, id = 0.0;
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = vec2(hash(n + g), hash(n + g + 17.0));
    float d = length(g + o - f);
    if (d < f1) { f2 = f1; f1 = d; id = hash(n + g + 31.0); }
    else if (d < f2) { f2 = d; }
  }
  return vec3(f1, f2 - f1, id);
}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);

  // Slight warp so plates aren't perfectly polygonal.
  vec2 p = uv * 5.0 + vec2(snoise(uv * 3.0), snoise(uv * 3.0 + 7.0)) * 0.25;
  vec3 v = voronoi(p);

  // Dried plates: dark maroon-brown with grain, shadowed where they break.
  float grain = fbm(uv * 18.0) * 0.5 + 0.5;
  vec3 crust = mix(vec3(0.085, 0.022, 0.02), vec3(0.17, 0.05, 0.04), grain);
  crust *= 0.8 + 0.4 * v.z;
  crust *= 0.55 + 0.45 * smoothstep(0.0, 0.14, v.y);

  // Fresh blood in the cracks; the width breathes slowly.
  float pulse = 0.5 + 0.5 * sin(u_time * 0.6 + v.z * 6.0);
  float width = 0.03 + 0.03 * pulse;
  float wet = smoothstep(width, width * 0.5, v.y);
  // Glossy wet surface: a soft highlight along the crest of each crack.
  float hgt = clamp(1.0 - v.y / width, 0.0, 1.0);
  vec3 blood = mix(vec3(0.16, 0.008, 0.015), vec3(0.40, 0.025, 0.04), hgt);
  blood += vec3(0.9, 0.6, 0.6) * pow(hgt, 8.0) * (0.12 + 0.12 * sin(u_time * 0.9 + v.z * 20.0));

  vec3 col = mix(crust, blood, wet);
  col *= 1.0 - 0.7 * smoothstep(0.3, 0.8, length(vUv - 0.5));
  gl_FragColor = vec4(col, 1.0);
}
`;

const BG_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float u_time;
uniform vec2 u_res;
${NOISE_GLSL}

// One layer of falling streaks; depth 0 far .. 1 near.
float rain(vec2 uv, float cols, float depth) {
  float x = uv.x * cols;
  float c = floor(x);
  float fx = fract(x);
  float seed = hash(vec2(c, 3.0 + depth));
  if (seed < 0.35) return 0.0;
  float speed = mix(0.25, 0.6, depth) * (0.7 + seed * 0.6);
  float y = fract(uv.y + u_time * speed + seed * 7.0);
  float len = mix(0.08, 0.22, seed);
  // Heavy head at the bottom, thin tail above.
  float along = smoothstep(0.0, 0.01, y) * smoothstep(len, 0.0, y);
  float thick = mix(0.10, 0.22, depth) * mix(0.4, 1.0, 1.0 - y / len);
  float across = smoothstep(thick, thick * 0.3, abs(fx - 0.5));
  return along * across;
}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 uv = vUv * vec2(aspect, 1.0);

  vec3 col = mix(vec3(0.02, 0.012, 0.014), vec3(0.04, 0.015, 0.018), vUv.y);
  float far = rain(uv, 70.0, 0.0);
  float near = rain(uv + 0.37, 28.0, 1.0);
  col = mix(col, vec3(0.12, 0.02, 0.03), far * 0.7);
  col = mix(col, vec3(0.22, 0.03, 0.045), near);
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
