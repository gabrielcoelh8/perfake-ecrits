"use client";

/**
 * Água — clear water seen from above, with fish.
 *
 * Main: a shallow teal pool. Animated caustics (an iterated sin/cos warp) net
 * the bottom with light; fish swim along looping paths, their bodies swaying
 * from head to tail, each with a soft shadow cast on the bottom — mostly dark,
 * one red. Rain rings open on the surface and pink cherry petals float by.
 *
 * Background: the same pool calmer and darker, with fewer, larger and slower
 * fish so they read beside the frosted reading column.
 *
 * Uniforms: u_time, u_res, u_calm (0 = lively cover, 1 = calm background).
 */

import { useMemo } from "react";
import ShaderQuad from "../ShaderQuad";
import { NOISE_GLSL } from "../shaders/noise";

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float u_time;
uniform vec2 u_res;
uniform float u_calm;
${NOISE_GLSL}

// Tileable water caustics: bright web where the warped field converges.
float caustic(vec2 uv, float t) {
  vec2 p = mod(uv * 6.2831, 6.2831) - 250.0;
  vec2 i = p;
  float c = 1.0;
  const float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - 3.5 / float(n + 1));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

// Fish in its own frame (x forward). Returns coverage; blur widens the edge.
float fishShape(vec2 p, float L, float W, float t, float blur) {
  float x = p.x / L;                                      // -1 tail .. 1 head
  float sway = sin(x * 2.5 - t * 5.0) * 0.18 * L * (1.0 - x) * 0.5;
  float y = p.y - sway;
  float w = W * sqrt(max(0.0, 1.0 - x * x)) * mix(0.35, 1.0, smoothstep(-1.0, 0.2, x));
  float body = max(abs(y) - w, (abs(x) - 1.0) * L);
  // Forked tail fin behind the body.
  float fx = -0.9 - x;
  float fin = max(abs(abs(y) - fx * W * 0.9) - fx * W * 0.5, max(-fx, fx - 0.55) * L);
  float d = min(body, fin);
  return smoothstep(blur, -blur, d);
}

// Fish i on a looping path; returns vec2(coverage at p, coverage of shadow).
vec2 fish(vec2 uv, float i, float spanX, float L, float speed) {
  float seed = hash(vec2(i, 2.0));
  float a = u_time * speed * (0.6 + seed * 0.6) + seed * 6.2831;
  float dirSign = seed > 0.5 ? 1.0 : -1.0;
  a *= dirSign;
  vec2 pos = vec2(cos(a) * spanX, sin(a * 1.3 + seed * 4.0) * 0.28);
  vec2 vel = vec2(-sin(a) * spanX, 1.3 * cos(a * 1.3 + seed * 4.0) * 0.28) * dirSign;
  vec2 dir = normalize(vel);
  vec2 n = vec2(-dir.y, dir.x);
  vec2 d = uv - pos;
  vec2 ds = d - vec2(0.025, -0.035);                     // shadow offset on the bottom
  float t = u_time + seed * 10.0;
  float body = fishShape(vec2(dot(d, dir), dot(d, n)), L, L * 0.28, t, 0.003);
  float shadow = fishShape(vec2(dot(ds, dir), dot(ds, n)), L, L * 0.28, t, 0.02);
  return vec2(body, shadow);
}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);
  float calm = u_calm;

  // Rain rings on the surface also bend the light on the bottom.
  vec2 rg = uv * mix(6.0, 3.0, calm);
  vec2 rid = floor(rg);
  vec2 rf = fract(rg) - 0.5;
  float rseed = hash(rid);
  float age = fract(u_time * 0.35 + rseed);
  vec2 rc = (vec2(hash(rid + 3.0), hash(rid + 5.0)) - 0.5) * 0.5;
  float rr = length(rf - rc);
  float ring = smoothstep(0.03, 0.0, abs(rr - age * 0.45)) * (1.0 - age) * step(0.75, rseed);

  // Bottom: teal, netted with caustics.
  vec2 cuv = uv * mix(1.1, 0.7, calm) + ring * 0.01;
  float c = caustic(cuv, u_time * 0.35);
  vec3 floorCol = mix(vec3(0.03, 0.14, 0.17), vec3(0.02, 0.085, 0.10), calm);
  floorCol *= 0.8 + 0.2 * snoise(uv * 3.0);
  vec3 col = floorCol + vec3(0.45, 0.80, 0.85) * c * mix(0.45, 0.32, calm);

  // Fish: shadows on the bottom first, then the bodies.
  float spanX = aspect * 0.38;
  float L = mix(0.075, 0.12, calm);
  float speed = mix(0.25, 0.12, calm);
  vec3 bodies = vec3(0.0);
  float cover = 0.0;
  float shade = 0.0;
  for (int k = 0; k < 5; k++) {
    float i = float(k);
    if (calm > 0.5 && k > 2) break;
    vec2 f = fish(uv, i, spanX, L, speed);
    shade = max(shade, f.y);
    vec3 fc = k == 0 ? vec3(0.62, 0.12, 0.08) : vec3(0.02, 0.05, 0.06);   // one red, the rest dark
    bodies = mix(bodies, fc, f.x);
    cover = max(cover, f.x);
  }
  col *= 1.0 - shade * 0.45;
  col = mix(col, bodies + vec3(0.3, 0.5, 0.5) * c * 0.15, cover * 0.92);

  // Surface: ring highlights and floating cherry petals.
  col += vec3(0.5, 0.75, 0.8) * ring * mix(0.35, 0.18, calm);
  for (int k = 0; k < 4; k++) {
    float i = float(k);
    float s = hash(vec2(i, 9.0));
    vec2 pc = vec2(fract(s + u_time * 0.01 * (0.5 + s)) * aspect - aspect * 0.5, (hash(vec2(i, 11.0)) - 0.5) * 0.8);
    vec2 pd = uv - pc;
    float a = u_time * 0.1 + s * 20.0;
    pd = mat2(cos(a), -sin(a), sin(a), cos(a)) * pd;
    float pr = mix(0.018, 0.03, calm);
    float petal = smoothstep(pr, pr * 0.8, length(pd * vec2(1.0, 1.7)));
    col = mix(col, mix(vec3(0.95, 0.62, 0.72), vec3(0.75, 0.40, 0.52), calm), petal * mix(0.95, 0.6, calm));
  }

  col *= mix(1.0, 0.9, calm);
  col *= 1.0 - 0.6 * smoothstep(0.35, 0.8, length(vUv - 0.5));
  gl_FragColor = vec4(col, 1.0);
}
`;

export function Main({ mode: _mode }: { mode: "cover" | "banner" }) {
  const uniforms = useMemo(() => ({ u_calm: { value: 0 } }), []);
  return <ShaderQuad fragment={FRAG} uniforms={uniforms} speed={1} />;
}

export function Background() {
  const uniforms = useMemo(() => ({ u_calm: { value: 1 } }), []);
  return <ShaderQuad fragment={FRAG} uniforms={uniforms} speed={1} />;
}
