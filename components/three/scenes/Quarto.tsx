"use client";

/**
 * Quarto — a wanderer in a darkening desert, under a sandstorm.
 *
 * Main: a dim golden-grey sky over two lines of dunes. On the far dune a tall
 * building stands half-sunk in the sand, its grid of windows smeared by moving
 * reflections; one window holds a small pale figure. On the near dune a
 * cloaked figure with a staff faces away, the cloak flapping in the wind.
 * Sheets of sand sweep across the frame in waves; the sun only shows through
 * the gaps between them, in glimpses.
 *
 * Background: the storm alone — stretched sand sheets and fine grains blowing
 * sideways over dark ochre, kept very dim behind the text.
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

// 1 inside the axis-aligned box centered at c with half-size h (soft edge).
float box(vec2 p, vec2 c, vec2 h) {
  vec2 d = abs(p - c) - h;
  return smoothstep(0.003, 0.0, max(d.x, d.y));
}

// Distance from p to the segment a-b.
float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}

// Density of blowing sand at uv: stretched sheets drifting right, in waves.
float storm(vec2 uv, float t) {
  float sheets = fbm(vec2(uv.x * 1.2 - t * 0.35, uv.y * 5.0 + sin(uv.x * 2.0 + t * 0.3) * 0.4)) * 0.5 + 0.5;
  float waves = 0.5 + 0.5 * sin(uv.x * 2.5 - t * 0.6 + uv.y * 1.5);
  return smoothstep(0.35, 0.8, sheets) * mix(0.4, 1.0, waves);
}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);
  float t = u_time;

  float dens = storm(uv, t);

  // Sky: dark grey at the top warming to a dim gold at the horizon.
  vec3 col = mix(vec3(0.26, 0.19, 0.11), vec3(0.07, 0.065, 0.065), smoothstep(-0.1, 0.5, uv.y));

  // Sun, glimpsed only where the storm thins out.
  vec2 sunP = vec2(0.2, 0.2);
  float sunD = length(uv - sunP);
  float glimpse = 1.0 - smoothstep(0.1, 0.6, storm(sunP, t));
  col += vec3(0.95, 0.72, 0.4) * (smoothstep(0.045, 0.04, sunD) * 0.5 + exp(-sunD * 7.0) * 0.25) * glimpse;

  // Far dune line (the building sinks into it).
  float farY = -0.06 + 0.035 * snoise(vec2(uv.x * 1.3, 2.0)) + 0.02 * sin(uv.x * 3.0);

  // Building: tall, dark, a grid of windows with moving reflections.
  vec2 bc = vec2(-0.2, 0.17);
  vec2 bh = vec2(0.075, 0.27);
  float bld = box(uv, bc, bh) * step(farY, uv.y);
  vec3 wall = vec3(0.06, 0.055, 0.05);
  vec2 wp = (uv - (bc - bh)) / vec2(0.03, 0.036);
  vec2 wc = floor(wp);
  vec2 wf = fract(wp);
  float win = step(0.2, wf.x) * step(wf.x, 0.8) * step(0.2, wf.y) * step(wf.y, 0.75)
            * step(0.0, wc.x) * step(wc.x, 4.0);
  // Storm reflections sliding across the glass, like a TV off the air.
  float refl = 0.5 + 0.5 * snoise(vec2(uv.x * 8.0 - t * 1.4, wc.y * 0.7));
  vec3 glass = mix(vec3(0.09, 0.085, 0.08), vec3(0.3, 0.24, 0.16), refl * refl);
  vec3 bcol = mix(wall, glass, win);
  // One window holds her: a small pale figure in white.
  vec2 herCell = vec2(2.0, 9.0);
  float isHer = step(length(wc - herCell), 0.1) * win;
  float her = smoothstep(0.1, 0.0, abs(wf.x - 0.5) - 0.06) * smoothstep(0.62, 0.55, wf.y);
  bcol = mix(bcol, vec3(0.78, 0.76, 0.72), isHer * her * (0.75 + 0.25 * sin(t * 0.7)));
  col = mix(col, bcol, bld);

  // Far dune, then the near dune.
  vec3 sandFar = vec3(0.17, 0.12, 0.075) + fbm(uv * vec2(4.0, 18.0)) * 0.015;
  col = mix(col, sandFar, smoothstep(0.004, -0.004, uv.y - farY));
  float nearY = -0.22 + 0.05 * sin(uv.x * 2.1 + 0.8) + 0.02 * snoise(vec2(uv.x * 2.5, 5.0));
  vec3 sandNear = vec3(0.1, 0.07, 0.045) + fbm(uv * vec2(6.0, 30.0) + vec2(t * 0.05, 0.0)) * 0.02;
  // Dune crest catches a little light.
  sandNear += vec3(0.12, 0.08, 0.04) * exp(-(nearY - uv.y) * 40.0);
  col = mix(col, sandNear, smoothstep(0.004, -0.004, uv.y - nearY));

  // The wanderer: cloaked, facing away, a staff in one hand.
  float fx = 0.22;
  float gy = -0.22 + 0.05 * sin(fx * 2.1 + 0.8) + 0.02 * snoise(vec2(fx * 2.5, 5.0));
  vec2 fp = uv - vec2(fx, gy);
  float h = clamp(fp.y / 0.085, 0.0, 1.0);
  // The cloak flares toward the ground and flaps to the right with the wind.
  float flap = (1.0 - h) * (0.012 + 0.008 * sin(t * 5.0 + fp.y * 60.0));
  float halfW = mix(0.026, 0.009, h);
  float cloak = step(0.0, fp.y) * step(fp.y, 0.085)
              * smoothstep(0.002, 0.0, abs(fp.x - flap * 0.5) - halfW - flap * 0.5);
  float head = smoothstep(0.0125, 0.0105, length(fp - vec2(0.0, 0.094)));
  float staff = smoothstep(0.0028, 0.0015, seg(fp, vec2(-0.034, -0.004), vec2(-0.028, 0.13)));
  float fig = max(max(cloak, head), staff);
  col = mix(col, vec3(0.02, 0.018, 0.018), fig);

  // Sand sheets over everything, heavier near the ground; fine grains streak.
  vec3 dust = vec3(0.34, 0.25, 0.15);
  float low = mix(1.0, 0.55, smoothstep(-0.3, 0.4, uv.y));
  col = mix(col, dust, dens * 0.55 * low);
  vec2 gp = floor(vec2((uv.x - t * 0.9) * 90.0, uv.y * 260.0));
  float grain = step(0.985, hash(gp)) * dens;
  col += vec3(0.25, 0.19, 0.12) * grain * 0.5;

  // Vignette, darkening the corners like the desert closing in.
  col *= 1.0 - 0.8 * smoothstep(0.3, 0.78, length(vUv - 0.5));
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
  float t = u_time;

  // Dark ochre ground, a touch warmer at the bottom.
  vec3 col = mix(vec3(0.045, 0.034, 0.024), vec3(0.02, 0.018, 0.018), vUv.y);

  // Two layers of stretched sand sheets blowing sideways at different speeds.
  float far = fbm(vec2(uv.x * 1.5 - t * 0.12, uv.y * 7.0)) * 0.5 + 0.5;
  float near = fbm(vec2(uv.x * 0.8 - t * 0.3, uv.y * 3.5 + 11.0)) * 0.5 + 0.5;
  float waves = 0.6 + 0.4 * sin(uv.x * 1.5 - t * 0.4 + uv.y * 2.0);
  col += vec3(0.07, 0.052, 0.032) * smoothstep(0.4, 0.8, far);
  col += vec3(0.1, 0.075, 0.045) * smoothstep(0.45, 0.85, near) * waves;

  // Fine grains streaking past.
  vec2 gp = floor(vec2((uv.x - t * 0.6) * 60.0, vUv.y * u_res.y / 3.0));
  col += vec3(0.08, 0.06, 0.04) * step(0.992, hash(gp)) * waves;

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
