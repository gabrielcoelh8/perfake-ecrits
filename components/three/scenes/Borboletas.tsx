"use client";

/**
 * Borboletas — a paper swan on a dark-green lake.
 *
 * Main: a still, dark-green lake with horizontal moonlit streaks (fbm stretched
 * along x) and slow concentric ripples spreading from the swan. The swan is an
 * origami figure built from triangle SDFs that share vertices, each facet with
 * its own shade and a darker crease along its edges, so it reads as one folded
 * sheet. It bobs gently; its reflection wobbles below the waterline.
 *
 * Background: none — the chapter page uses a plain background for this one.
 *
 * Uniforms: u_time, u_res.
 */

import ShaderQuad from "../ShaderQuad";
import { NOISE_GLSL } from "../shaders/noise";

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float u_time;
uniform vec2 u_res;
${NOISE_GLSL}

// Exact signed distance to a triangle (Inigo Quilez), negative inside.
float sdTri(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
  vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2;
  vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
  vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                   vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                   vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}

// Paints one paper facet over col: fill with a shade, crease on its edges.
void facet(inout vec3 col, inout float cover, vec2 p, vec2 a, vec2 b, vec2 c, float shade) {
  float d = sdTri(p, a, b, c);
  float m = smoothstep(0.0025, -0.0025, d);
  vec3 paper = vec3(0.93, 0.92, 0.87) * shade;
  paper *= 0.97 + 0.03 * snoise(p * 180.0);              // paper fibre
  paper *= 1.0 - 0.28 * smoothstep(0.006, 0.0, abs(d));   // crease
  col = mix(col, paper, m);
  cover = max(cover, m);
}

// Origami swan facing right; waterline at y = 0. Returns coverage in .a.
vec4 swan(vec2 p) {
  vec3 col = vec3(0.0);
  float cover = 0.0;
  // Tail and wings (back to front).
  facet(col, cover, p, vec2(-0.36, 0.20), vec2(-0.22, 0.0), vec2(-0.06, 0.09), 0.62);
  facet(col, cover, p, vec2(-0.22, 0.0), vec2(0.14, 0.0), vec2(-0.06, 0.09), 0.80);
  facet(col, cover, p, vec2(-0.06, 0.09), vec2(0.14, 0.0), vec2(0.05, 0.13), 1.00);
  facet(col, cover, p, vec2(-0.30, 0.13), vec2(-0.06, 0.09), vec2(-0.14, 0.03), 0.90);
  // Breast.
  facet(col, cover, p, vec2(0.14, 0.0), vec2(0.20, 0.03), vec2(0.12, 0.06), 0.72);
  // Neck: two long facets rising from the breast.
  facet(col, cover, p, vec2(0.12, 0.04), vec2(0.18, 0.03), vec2(0.13, 0.33), 0.95);
  facet(col, cover, p, vec2(0.18, 0.03), vec2(0.155, 0.33), vec2(0.13, 0.33), 0.66);
  // Head and beak.
  facet(col, cover, p, vec2(0.13, 0.33), vec2(0.155, 0.33), vec2(0.15, 0.37), 0.85);
  facet(col, cover, p, vec2(0.15, 0.37), vec2(0.155, 0.33), vec2(0.23, 0.325), 0.70);
  return vec4(col, cover);
}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);

  // Swan placement and bob.
  vec2 origin = vec2(0.0, -0.12 + sin(u_time * 0.8) * 0.006);
  float tilt = sin(u_time * 0.55) * 0.03;
  mat2 R = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt));

  // Lake: dark green, darker toward the top (distance).
  vec3 col = mix(vec3(0.035, 0.13, 0.085), vec3(0.01, 0.055, 0.04), vUv.y);
  // Moonlit streaks stretched along x.
  float streak = fbm(vec2(uv.x * 2.0 + u_time * 0.03, uv.y * 22.0 - u_time * 0.05));
  col += vec3(0.20, 0.35, 0.28) * smoothstep(0.35, 0.8, streak) * 0.35;
  // Slow rings spreading from the swan.
  vec2 rp = (uv - origin) * vec2(1.0, 3.2);
  float rd = length(rp);
  float ring = sin(rd * 55.0 - u_time * 1.6) * 0.5 + 0.5;
  col += vec3(0.25, 0.45, 0.35) * pow(ring, 8.0) * exp(-rd * 3.5) * 0.35;

  // Reflection: mirrored across the waterline, wobbling, faded.
  vec2 q = R * (uv - origin);
  vec2 rq = vec2(q.x + sin(q.y * 90.0 + u_time * 2.5) * 0.004, -q.y);
  if (q.y < 0.0) {
    vec4 r = swan(rq);
    col = mix(col, r.rgb * 0.28 + vec3(0.0, 0.03, 0.02), r.a * 0.7 * smoothstep(-0.4, 0.0, q.y));
  }

  // The swan itself, above the waterline.
  if (q.y >= 0.0) {
    vec4 s = swan(q);
    col = mix(col, s.rgb, s.a);
  }
  // Waterline shadow just under the hull.
  col *= 1.0 - 0.5 * smoothstep(0.02, 0.0, abs(q.y + 0.005)) * step(-0.24, q.x) * step(q.x, 0.2);

  col *= 1.0 - 0.7 * smoothstep(0.3, 0.75, length(vUv - 0.5));
  gl_FragColor = vec4(col, 1.0);
}
`;

export function Main({ mode: _mode }: { mode: "cover" | "banner" }) {
  return <ShaderQuad fragment={FRAG} speed={1} />;
}

// No background scene for Borboletas — chapter page uses a plain background.
