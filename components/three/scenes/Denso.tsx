"use client";

/**
 * Denso — looking down the shaft of an endless building.
 *
 * Main: a square shaft seen from above (tunnel mapping: each pixel's depth is
 * 1 / max(|x|, |y|)). Its four walls are stacked levels of corridor — rows of
 * dirty metal doors, some bloodstained or tagged, a grated walkway and a rail
 * at every level — sinking slowly as if the camera were descending. Sparse
 * fluorescent lamps flicker; fog swallows the depth, so the bottom is never
 * seen. A drop of acid-green rain falls down the middle.
 *
 * Background: the same shaft, dimmer and slower, no drop.
 *
 * Uniforms: u_time, u_res, u_dim (0 cover, 1 background).
 */

import { useMemo } from "react";
import ShaderQuad from "../ShaderQuad";
import { NOISE_GLSL } from "../shaders/noise";

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float u_time;
uniform vec2 u_res;
uniform float u_dim;
${NOISE_GLSL}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  p /= mix(1.0, 1.6, u_dim);

  // Tunnel mapping of a shaft; on wide frames (the banner) it widens to match.
  float ax = max(aspect * 0.6, 1.0);
  float r = max(abs(p.x) / ax, abs(p.y));
  float z = 0.25 / max(r, 0.001);                  // depth
  float side = step(abs(p.y), abs(p.x) / ax);     // 1 = left/right wall
  float a = mix(p.x / max(abs(p.y), 0.001), p.y * ax / max(abs(p.x), 0.001), side);
  float face = side * (p.x > 0.0 ? 0.0 : 1.0) + (1.0 - side) * (p.y > 0.0 ? 2.0 : 3.0);

  // Levels along depth, sinking slowly. A wall is 0.5 wide (two doors) and a
  // level 0.4 deep, so doors keep a door-like proportion.
  float zz = (z + u_time * mix(0.05, 0.02, u_dim)) / 0.4;
  float level = floor(zz);
  float lz = fract(zz);
  // Doors along the wall.
  float da = (a + 1.0) * 1.0;
  float door = floor(da);
  float fx = fract(da);
  vec2 id = vec2(door + face * 13.0, level);
  float seed = hash(id);

  // Concrete wall with grime.
  vec3 wall = vec3(0.10, 0.11, 0.10) * (0.7 + 0.5 * fbm(vec2(a * 2.0, zz * 0.8) + face * 5.0));
  vec3 col = wall;

  // Metal door with a seam and occasional stains or tags.
  float inDoor = step(0.22, fx) * step(fx, 0.78) * step(0.22, lz) * step(lz, 0.88);
  vec3 metal = mix(vec3(0.16, 0.18, 0.17), vec3(0.24, 0.25, 0.22), hash(id + 1.0));
  metal *= 0.85 + 0.15 * snoise(vec2(fx * 20.0, lz * 3.0));
  float stain = step(0.8, seed) * smoothstep(0.2, 0.6, fbm(vec2(fx, lz) * 4.0 + seed * 10.0));
  metal = mix(metal, vec3(0.20, 0.03, 0.03), stain * 0.8);
  float tag = step(0.65, hash(id + 2.0)) * step(0.55, abs(sin((fx + snoise(vec2(lz * 6.0, seed)) * 0.1) * 30.0)))
            * step(0.45, lz) * step(lz, 0.65) * step(0.3, fx) * step(fx, 0.7);
  metal = mix(metal, vec3(0.02), tag * 0.8);
  col = mix(col, metal, inDoor);

  // Grated walkway and rail at the base of each level.
  float walk = step(lz, 0.14);
  float grate = step(0.5, fract(fx * 8.0)) * step(0.5, fract(lz * 60.0));
  col = mix(col, vec3(0.05, 0.055, 0.05) + grate * 0.05, walk);
  col = mix(col, vec3(0.45, 0.42, 0.36), smoothstep(0.012, 0.0, abs(lz - 0.16)) * 0.7);

  // Fluorescent lamps over some doors, flickering green-white.
  float lamp = step(0.78, hash(id + 4.0));
  float flick = step(0.15, hash(vec2(floor(u_time * 9.0), seed)));
  float glow = lamp * flick * exp(-length(vec2((fx - 0.5) * 2.0, (lz - 0.93) * 6.0)) * 2.0);
  col += vec3(0.55, 0.75, 0.55) * glow * 0.7;

  // Fog: deeper is darker; the center is an unseen bottom.
  col *= exp(-z * 0.45);
  col = mix(col, vec3(0.01, 0.015, 0.012), smoothstep(2.0, 5.0, z));

  // Acid-green drop falling down the middle, shrinking as it falls away.
  if (u_dim < 0.5) {
    float fall = fract(u_time * 0.2);
    float size = mix(0.045, 0.004, sqrt(fall));
    vec2 dp = (p - vec2(0.0, size * 0.4)) / size;
    dp.x *= 1.0 + max(dp.y, 0.0) * 0.6;              // teardrop: pointed on top
    float drop = smoothstep(1.0, 0.8, length(dp * vec2(1.0, 0.75)));
    vec3 dc = mix(vec3(0.15, 0.45, 0.10), vec3(0.6, 0.95, 0.45), smoothstep(0.8, 0.0, length(dp - vec2(-0.3, 0.3))));
    col = mix(col, dc, drop * (1.0 - fall * 0.6));
    col += vec3(0.1, 0.3, 0.08) * exp(-length(p) / size * 0.8) * (1.0 - fall);
  }

  col *= mix(1.0, 0.55, u_dim);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function Main({ mode: _mode }: { mode: "cover" | "banner" }) {
  const uniforms = useMemo(() => ({ u_dim: { value: 0 } }), []);
  return <ShaderQuad fragment={FRAG} uniforms={uniforms} speed={1} />;
}

export function Background() {
  const uniforms = useMemo(() => ({ u_dim: { value: 1 } }), []);
  return <ShaderQuad fragment={FRAG} uniforms={uniforms} speed={1} />;
}
