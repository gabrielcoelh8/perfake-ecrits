"use client";

/**
 * Mãos — two hands in blue surgical gloves.
 *
 * Main: two mirrored gloved hands raised toward each other, palm out. Each hand
 * is an SDF (rounded palm, four tapered jointed fingers and a two-segment thumb,
 * smooth-unioned, with the wrist and a rolled cuff). The SDF is turned into a
 * height field for normals, so the latex gets diffuse light, a hard specular
 * sheen and faint knuckle creases. Red slowly soaks up from under the
 * fingertips — the red that never comes off beneath the gloves.
 *
 * Background: dark rose petals falling slowly, large and soft-edged (each at
 * its own depth of field), tumbling as they drift.
 *
 * Uniforms: u_time, u_res.
 */

import { useMemo } from "react";
import ShaderQuad from "../ShaderQuad";
import { NOISE_GLSL } from "../shaders/noise";

const HAND_GLSL = /* glsl */ `
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Capsule from a (radius ra) to b (radius rb); also returns position along it.
float sdTaper(vec2 p, vec2 a, vec2 b, float ra, float rb, out float h) {
  vec2 pa = p - a, ba = b - a;
  h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - mix(ra, rb, h);
}

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Hand, palm out, fingers up, thumb to +x. Returns (sdf, crease, fingertip-ness).
vec3 hand(vec2 p) {
  float h;
  float crease = 0.0;
  float tip = 0.0;
  float d = sdRoundBox(p - vec2(0.0, -0.04), vec2(0.105, 0.12), 0.05);

  // Fingers: base x, length, lean angle.
  vec3 F[4];
  F[0] = vec3(-0.080, 0.17, -0.16);   // little
  F[1] = vec3(-0.027, 0.23, -0.05);   // ring
  F[2] = vec3( 0.027, 0.25,  0.03);   // middle
  F[3] = vec3( 0.080, 0.22,  0.11);   // index
  for (int i = 0; i < 4; i++) {
    vec2 a = vec2(F[i].x, 0.05);
    vec2 b = a + vec2(sin(F[i].z), cos(F[i].z)) * F[i].y;
    float fd = sdTaper(p, a, b, 0.029, 0.022, h);
    if (fd < d + 0.02) {
      crease = max(crease, (smoothstep(0.03, 0.0, abs(h - 0.55)) + smoothstep(0.03, 0.0, abs(h - 0.8))) * step(fd, 0.0));
      tip = max(tip, h * step(fd, 0.0));
    }
    d = smin(d, fd, 0.012);
  }

  // Thumb: two segments swinging out and up.
  float t1 = sdTaper(p, vec2(0.085, -0.11), vec2(0.17, -0.01), 0.045, 0.033, h);
  float t2 = sdTaper(p, vec2(0.17, -0.01), vec2(0.215, 0.07), 0.033, 0.025, h);
  if (t2 < 0.0) tip = max(tip, h);
  d = smin(d, min(t1, t2), 0.03);

  // Wrist and glove cuff.
  float wrist = sdTaper(p, vec2(0.0, -0.16), vec2(0.0, -0.42), 0.095, 0.085, h);
  d = smin(d, wrist, 0.04);
  crease = max(crease, smoothstep(0.012, 0.0, abs(p.y + 0.31)) * step(wrist, 0.0));
  return vec3(d, crease, tip);
}

// Latex thickness as a height field from the SDF (rounded edges).
float handH(vec2 p) {
  return sqrt(clamp(-hand(p).x / 0.035, 0.0, 1.0));
}
`;

const MAIN_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float u_time;
uniform vec2 u_res;
${NOISE_GLSL}
${HAND_GLSL}

vec3 shadeHand(vec2 p, vec3 bg) {
  vec3 H = hand(p);
  float mask = smoothstep(0.003, -0.003, H.x);
  if (mask <= 0.0) return bg;

  const float e = 0.004;
  float h0 = handH(p);
  vec3 n = normalize(vec3(h0 - handH(p + vec2(e, 0.0)), h0 - handH(p + vec2(0.0, e)), 0.12));
  n.xy += vec2(snoise(p * 70.0), snoise(p * 70.0 + 3.0)) * 0.03;   // latex wrinkle
  n = normalize(n);

  vec3 L = normalize(vec3(-0.45, 0.65, 0.6));
  float diff = max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 36.0);

  vec3 glove = vec3(0.13, 0.32, 0.60);
  // Red soaking up under the latex from the fingertips.
  float soak = 0.62 + 0.18 * sin(u_time * 0.25);
  float blood = smoothstep(soak, soak + 0.25, H.z + snoise(p * 25.0) * 0.08);
  glove = mix(glove, vec3(0.36, 0.04, 0.10), blood * 0.85);

  vec3 col = glove * (0.25 + 0.9 * diff);
  col += vec3(0.75, 0.85, 1.0) * spec * 0.55;
  col *= 1.0 - H.y * 0.35;                                          // creases
  col += vec3(0.25, 0.4, 0.7) * smoothstep(0.012, 0.0, abs(H.x)) * 0.25; // rim
  return mix(bg, col, mask);
}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);

  // Dark room with a soft spotlight from above.
  vec3 col = vec3(0.012, 0.015, 0.024);
  col += vec3(0.06, 0.08, 0.12) * exp(-length((uv - vec2(0.0, 0.25)) * vec2(0.8, 1.2)) * 3.0);

  float breathe = sin(u_time * 0.5) * 0.01;
  // Right hand (thumb inward), tilted toward the center.
  vec2 pR = uv - vec2(0.19, 0.03 + breathe);
  float aR = 0.14;
  pR = mat2(cos(aR), sin(aR), -sin(aR), cos(aR)) * pR;
  pR.x = -pR.x;
  // Left hand, its mirror.
  vec2 pL = uv - vec2(-0.19, 0.03 - breathe);
  pL = mat2(cos(-aR), sin(-aR), -sin(-aR), cos(-aR)) * pL;

  col = shadeHand(pL * 1.45, col);
  col = shadeHand(pR * 1.45, col);

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

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 uv = vUv * vec2(aspect, 1.0);

  vec3 col = mix(vec3(0.02, 0.012, 0.018), vec3(0.035, 0.015, 0.025), vUv.y);
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float seed = hash(vec2(fi, 1.0));
    float depth = hash(vec2(fi, 5.0));                  // 0 far .. 1 near
    float size = mix(0.035, 0.09, depth);
    float fall = fract(seed - u_time * mix(0.012, 0.03, depth));
    float x = hash(vec2(fi, 4.0)) * aspect + sin(u_time * 0.3 + seed * 12.0) * 0.05;
    vec2 d = uv - vec2(x, 1.1 - fall * 1.2);
    float a = u_time * (0.2 + seed * 0.4) + seed * 30.0;
    d = mat2(cos(a), -sin(a), sin(a), cos(a)) * d / size;
    // Tumbling in 3D: the petal's width flips as it turns over.
    d.x /= 0.25 + 0.75 * abs(cos(u_time * (0.3 + seed * 0.5) + seed * 9.0));
    // Teardrop: narrow at the base, round at the top, notched at the tip.
    float w = mix(0.35, 1.0, smoothstep(-1.0, 0.6, d.y));
    float r = length(vec2(d.x / w, d.y));
    float notch = smoothstep(0.3, 0.0, length(d - vec2(0.0, 1.0)));
    float blur = mix(0.4, 0.08, depth);                  // near petals sharp, far ones soft
    float m = smoothstep(1.0, 1.0 - blur, r) * (1.0 - notch);
    vec3 petal = mix(vec3(0.20, 0.03, 0.08), vec3(0.42, 0.08, 0.16), smoothstep(-1.0, 1.0, d.y));
    col = mix(col, petal * mix(0.5, 1.0, depth), m * 0.9);
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
