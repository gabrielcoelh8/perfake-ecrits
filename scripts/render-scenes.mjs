/**
 * Renders the chapter scenes (components/three/scenes/*.tsx) to PNG sheets, so
 * shader changes can be checked without opening the site.
 *
 *   npm run scenes                     # every scene
 *   npm run scenes -- Agua Seco        # only these
 *   npm run scenes -- --t=0,2,5        # other moments (seconds of u_time)
 *
 * For each scene it writes .scene-shots/<Scene>.png: one row per moment with
 * the home cover (400×400), the chapter banner (1400×260) and, when the scene
 * has one, the page background (900×560) under the frosted reading column the
 * chapter page puts over it. Shaders that fail to compile are reported and the
 * script exits with code 1.
 *
 * The GLSL is pulled straight out of the scene files (the `/* glsl *\/` template
 * literals, with `${NAME}` chunks inlined) and drawn with plain WebGL on a
 * fullscreen quad — the same inputs ShaderQuad gives it (vUv, u_time, u_res).
 * Scene-specific uniforms are listed in UNIFORMS below; keep it in step with
 * the uniforms each scene's Main/Background pass to ShaderQuad.
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCENES_DIR = path.join(ROOT, "components/three/scenes");
const NOISE_FILE = path.join(ROOT, "components/three/shaders/noise.ts");
const OUT = path.join(ROOT, ".scene-shots");

// Per-scene uniforms for each view, mirroring what the components pass.
const UNIFORMS = {
  Agua: { cover: { u_calm: 0 }, banner: { u_calm: 0 }, bg: { u_calm: 1 } },
  Construcao: {
    cover: { u_cols: 5, u_dim: 0 },
    banner: { u_cols: 16, u_dim: 0 },
    bg: { u_cols: 7, u_dim: 1 },
  },
  Denso: { cover: { u_dim: 0 }, banner: { u_dim: 0 }, bg: { u_dim: 1 } },
};

const VIEWS = {
  cover: { w: 400, h: 400 },
  banner: { w: 1400, h: 260 },
  bg: { w: 900, h: 560 },
};

const args = process.argv.slice(2);
const times = (args.find((a) => a.startsWith("--t="))?.slice(4) ?? "0,3,7").split(",").map(Number);
const only = args.filter((a) => !a.startsWith("--"));

// `const NAME = /* glsl */ \`...\`;` blocks in a file.
function glslBlocks(src) {
  const blocks = {};
  for (const m of src.matchAll(/const (\w+) = \/\* glsl \*\/ `([\s\S]*?)`;/g)) blocks[m[1]] = m[2];
  return blocks;
}

function loadScene(name) {
  const src = fs.readFileSync(path.join(SCENES_DIR, `${name}.tsx`), "utf8");
  const all = { ...glslBlocks(fs.readFileSync(NOISE_FILE, "utf8")), ...glslBlocks(src) };
  const expand = (s) => s.replace(/\$\{(\w+)\}/g, (_, k) => expand(all[k] ?? ""));
  // Either one shared FRAG (Main and Background differ by uniforms) or MAIN_FRAG/BG_FRAG.
  const main = all.MAIN_FRAG ?? all.FRAG;
  const hasBg = /export function Background/.test(src);
  return {
    name,
    main: expand(main),
    bg: hasBg ? expand(all.BG_FRAG ?? all.FRAG) : null,
    uniforms: UNIFORMS[name] ?? {},
  };
}

const sceneNames = fs
  .readdirSync(SCENES_DIR)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => f.replace(/\.tsx$/, ""))
  .filter((n) => only.length === 0 || only.includes(n));

if (sceneNames.length === 0) {
  console.error(`No scenes match: ${only.join(", ")}`);
  process.exit(1);
}

// Runs in the page: draws one fragment shader and returns a PNG data URL.
function drawInPage({ frag, w, h, t, uniforms }) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const gl = c.getContext("webgl", { preserveDrawingBuffer: true });
  const compile = (type, s) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, s);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };
  const vert = "attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }";
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1f(gl.getUniformLocation(prog, "u_time"), t);
  gl.uniform2f(gl.getUniformLocation(prog, "u_res"), w, h);
  for (const [k, v] of Object.entries(uniforms)) gl.uniform1f(gl.getUniformLocation(prog, k), v);
  gl.viewport(0, 0, w, h);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  const url = c.toDataURL("image/png");
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return url;
}

// The chapter page's reading column (see app/chor/[slug]/chapter.module.css).
const PANEL_CSS =
  "position:absolute;top:0;bottom:0;left:22%;right:22%;padding:24px;overflow:hidden;" +
  "background:rgba(8,8,8,.62);backdrop-filter:blur(14px) saturate(.9);border:1px solid #2a2a2a;" +
  "color:#ddd;font:16px/1.7 Georgia,serif";
const SAMPLE_TEXT =
  "Tudo ao redor parecia entrar em estado líquido e transparente quando sentia as gotas do chuveiro " +
  "pingarem constantemente no seu rosto. Esqueceu de tudo por alguns minutos, se concentrando apenas " +
  "naquela sensação calmante que a água morna proporcionava. ";

const browser = await chromium
  .launch({
    executablePath: process.env.CHROME_PATH || undefined,
    // Software GL so it runs the same on machines without a GPU.
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  })
  .catch((e) => {
    console.error(e.message);
    console.error("\nInstall the browser with: npx playwright install chromium-headless-shell");
    process.exit(1);
  });

fs.mkdirSync(OUT, { recursive: true });
const page = await browser.newPage();
let failed = 0;

for (const name of sceneNames) {
  const scene = loadScene(name);
  const views = [["cover", scene.main], ["banner", scene.main]];
  if (scene.bg) views.push(["bg", scene.bg]);

  const rows = [];
  let error = null;
  for (const t of times) {
    const cells = [];
    for (const [view, frag] of views) {
      const { w, h } = VIEWS[view];
      const uniforms = scene.uniforms[view] ?? {};
      const url = await page
        .evaluate(drawInPage, { frag, w, h, t, uniforms })
        .catch((e) => ((error = `${view}: ${e.message}`), null));
      if (!url) break;
      cells.push({ view, url, w, h });
    }
    if (error) break;
    rows.push({ t, cells });
  }

  if (error) {
    failed++;
    console.error(`✗ ${name} — ${error}`);
    continue;
  }

  // Lay the renders out at half size and screenshot the sheet.
  const html = rows
    .map(
      ({ t, cells }) =>
        `<div class="row"><div class="t">t=${t}</div>` +
        cells
          .map(
            ({ view, url, w, h }) =>
              `<div class="cell" style="width:${w / 2}px;height:${h / 2}px">` +
              `<img src="${url}" width="${w / 2}" height="${h / 2}">` +
              (view === "bg" ? `<div class="panel">${SAMPLE_TEXT.repeat(4)}</div>` : "") +
              `</div>`,
          )
          .join("") +
        `</div>`,
    )
    .join("");
  await page.setContent(
    `<style>
      body { margin:0; padding:12px; background:#222; color:#999; font:12px monospace; width:max-content; }
      h1 { font-size:14px; margin:0 0 8px; color:#ddd; }
      .row { display:flex; gap:8px; align-items:flex-start; margin-bottom:8px; }
      .t { width:40px; }
      .cell { position:relative; }
      .cell img { display:block; }
      .panel { ${PANEL_CSS}; font-size:8px; padding:12px; }
    </style><h1>${name}</h1>${html}`,
  );
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`✓ ${name} → ${path.relative(ROOT, file)}`);
}

await browser.close();
process.exit(failed ? 1 : 0);
