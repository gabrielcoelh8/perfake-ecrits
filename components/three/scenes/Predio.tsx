"use client";

/**
 * Prédio — a door left ajar in a dark room.
 *
 * Main: a dark wall and floor with a framed door, two inset panels and a silver
 * knob. The door stands slightly open on its right edge: a thin crack of cold
 * light that breathes in width and flickers like a failing fluorescent tube,
 * spilling a widening wedge of light across the floor.
 *
 * Background: CRT static — per-pixel hashed noise re-rolled each frame, faint
 * scanlines and a slow rolling band, kept very dim behind the text.
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
  return smoothstep(0.004, 0.0, max(d.x, d.y));
}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);

  const float FLOOR_Y = -0.32;
  const float DOOR_X = 0.17;   // half-width
  const float DOOR_TOP = 0.33;

  // Cold light that flickers: mostly on, occasionally dropping out.
  float tick = floor(u_time * 7.0);
  float flick = mix(0.2, 1.0, step(0.12, hash(vec2(tick, 1.0))));
  flick *= 0.85 + 0.15 * sin(u_time * 31.0);
  vec3 light = vec3(0.72, 0.84, 0.95) * flick;

  // Wall and floor.
  vec3 col = vec3(0.035, 0.04, 0.05) + snoise(uv * 30.0) * 0.006;
  if (uv.y < FLOOR_Y) col = vec3(0.02, 0.022, 0.028);

  // Door frame, then the opening (the dark room beyond the door).
  float doorMid = (DOOR_TOP + FLOOR_Y) * 0.5;
  float doorHalfH = (DOOR_TOP - FLOOR_Y) * 0.5;
  col = mix(col, vec3(0.09, 0.09, 0.10), box(uv, vec2(0.0, doorMid + 0.01), vec2(DOOR_X + 0.02, doorHalfH + 0.01)));
  float opening = box(uv, vec2(0.0, doorMid), vec2(DOOR_X, doorHalfH));

  // The crack on the right edge breathes in width; light fills it.
  float gap = 0.018 + 0.010 * sin(u_time * 0.4);
  float crackX = DOOR_X - gap;
  col = mix(col, light, opening);

  // Door panel covers the opening except the crack.
  float panel = opening * smoothstep(0.003, 0.0, uv.x - crackX);
  vec3 wood = vec3(0.10, 0.08, 0.075) + snoise(vec2(uv.x * 4.0, uv.y * 60.0)) * 0.01;
  col = mix(col, wood, panel);
  // Two inset panels, slightly darker with a lit top bevel.
  vec2 ip1 = vec2(-gap * 0.5, doorMid + 0.15);
  vec2 ip2 = vec2(-gap * 0.5, doorMid - 0.14);
  vec2 ih = vec2(DOOR_X - gap - 0.05, 0.11);
  col = mix(col, wood * 0.7, panel * (box(uv, ip1, ih) + box(uv, ip2, ih)));

  // Silver knob with a highlight.
  vec2 kp = uv - vec2(crackX - 0.04, doorMid - 0.01);
  float knob = smoothstep(0.018, 0.014, length(kp));
  vec3 silver = mix(vec3(0.35, 0.36, 0.40), vec3(0.85, 0.87, 0.92), smoothstep(0.012, 0.0, length(kp - vec2(0.005, 0.006))));
  col = mix(col, silver, knob * panel);

  // Glow bleeding from the crack onto the wall around the door.
  col += light * exp(-abs(uv.x - DOOR_X + gap * 0.5) * 35.0) * 0.12
             * smoothstep(DOOR_TOP + 0.05, DOOR_TOP - 0.05, uv.y) * step(FLOOR_Y, uv.y) * (1.0 - opening);

  // Wedge of light spilling across the floor.
  if (uv.y < FLOOR_Y) {
    float dist = FLOOR_Y - uv.y;
    float left = crackX - dist * 0.4;
    float right = DOOR_X + dist * 1.6;
    float wedge = smoothstep(left - 0.01, left + 0.02, uv.x) * smoothstep(right + 0.02, right - 0.03, uv.x);
    col += light * wedge * 0.35 * exp(-dist * 4.0);
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
  // Static: coarse 2px grain re-rolled ~24 times a second.
  vec2 px = floor(vUv * u_res / 2.0);
  float n = hash(px + floor(u_time * 24.0) * 17.0);
  vec3 col = vec3(n) * 0.11;

  // Scanlines and a slow rolling brighter band.
  col *= 0.75 + 0.25 * sin(vUv.y * u_res.y * 1.5);
  float band = smoothstep(0.08, 0.0, abs(fract(vUv.y - u_time * 0.05) - 0.5));
  col += vec3(0.05, 0.06, 0.07) * band;

  col += vec3(0.01, 0.012, 0.016);  // cold blue-black floor
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
