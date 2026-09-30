"use client";

import { useEffect, useRef, useState } from "react";
import type { AuraParams } from "@/lib/aura";
import { Mesh } from "./Mesh";

const VERTEX = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

// One full-screen pass: domain-warped nebula, aurora ribbons, a glowing core with
// sound-wave ripples, and twinkling stars — each layer weighted by a listening trait.
const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uC0, uC1, uC2, uC3, uBg;
uniform float uSeed, uSpeed, uWarp, uNebula, uAurora, uStars, uGlow, uRipple, uGrain, uLight;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.02; a *= 0.5; }
  return v;
}

vec3 stars(vec2 p, float scale, float layer) {
  vec2 g = p * scale;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash(id + uSeed * 0.01 + layer * 17.0);
  if (h < 1.0 - uStars * 0.22) return vec3(0.0);
  vec2 off = (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.7;
  float d = length(f - off);
  float tw = 0.5 + 0.5 * sin(uTime * (0.35 + h * 1.4) + h * 60.0);
  tw = pow(tw, 3.0);
  float core = smoothstep(0.06, 0.0, d);
  float halo = smoothstep(0.25, 0.0, d) * 0.25;
  vec3 tint = mix(vec3(1.0, 0.96, 0.9), mix(uC1, uC2, h), 0.35);
  return tint * (core + halo) * tw;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * (0.02 + uSpeed * 0.06);
  vec2 so = vec2(uSeed * 0.137, uSeed * 0.291);

  // Nebula: fbm warped by fbm, coloured through the palette.
  vec2 sp = p * 1.4 + so;
  vec2 q = vec2(fbm(sp + t), fbm(sp + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(sp + 3.5 * uWarp * q + vec2(1.7, 9.2) + 0.7 * t),
                fbm(sp + 3.5 * uWarp * q + vec2(8.3, 2.8) - 0.6 * t));
  float f = fbm(sp + 3.5 * uWarp * r);
  vec3 neb = mix(uC0, uC1, clamp(f * f * 2.2, 0.0, 1.0));
  neb = mix(neb, uC2, clamp(length(q) * 0.7 - 0.2, 0.0, 1.0));
  neb = mix(neb, uC3, clamp(r.y * r.y, 0.0, 1.0) * 0.4);
  float nebMask = smoothstep(0.25, 0.95, f) * (0.35 + 0.65 * uNebula);

  vec3 col = uBg;
  col = mix(col, neb, nebMask * 0.9);

  // Aurora: soft ribbons with vertical rays, drifting across the upper sky.
  vec3 aur = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float y = 0.12 + 0.13 * fi
      + 0.09 * sin(p.x * (1.3 + fi * 0.6) + t * 4.0 + fi * 2.1 + uSeed)
      + 0.12 * (fbm(vec2(p.x * 1.6 + fi * 4.0 + so.x, t * 1.5 + fi)) - 0.5);
    float dy = p.y - y;
    float band = exp(-dy * dy * (60.0 + fi * 30.0)) + 0.5 * exp(-max(dy, 0.0) * 6.0) * step(0.0, dy) * exp(-dy * dy * 8.0);
    float rays = 0.45 + 0.55 * fbm(vec2(p.x * 14.0 + fi * 3.0 + so.y, t * 3.0));
    vec3 c = mix(uC2, uC1, fi / 2.0);
    aur += c * band * rays * (0.9 - fi * 0.2);
  }
  col += aur * uAurora * 0.55;

  // Core: a light source in the sky whose brightness is loyalty to one artist.
  vec2 cp = vec2(0.45 * sin(uSeed * 1.7), 0.18 * cos(uSeed * 2.3) - 0.05)
          + 0.04 * vec2(sin(t * 3.0), cos(t * 2.4));
  float d = length(p - cp);
  float glow = 0.012 / (d * d + 0.012) + 0.6 * exp(-d * 3.0);
  col += mix(uC0, vec3(1.0), 0.25) * glow * uGlow * 0.55;

  // Ripples: rings pulsing out from the core, like a song on repeat.
  float ring = sin(d * 60.0 - uTime * (0.8 + uSpeed * 1.6));
  ring = smoothstep(0.9, 1.0, ring) * exp(-d * 4.5) * smoothstep(0.02, 0.08, d);
  col += mix(uC2, vec3(1.0), 0.3) * ring * uRipple * 0.35;

  // Stars, three depths, dimmed where the nebula is thick.
  vec3 st = stars(p, 22.0, 0.0) + stars(p + 3.3, 38.0, 1.0) * 0.7 + stars(p + 7.1, 64.0, 2.0) * 0.45;
  col += st * (1.0 - nebMask * 0.6) * (1.0 - uLight) * min(1.0, uStars * 1.6);

  // Daylight skies: wash towards white, keep the colour.
  col = mix(col, 1.0 - (1.0 - col) * 0.5, uLight * 0.35);

  // Vignette and grain.
  col *= 1.0 - 0.45 * pow(length(uv - 0.5) * 1.2, 2.0) * (1.0 - uLight * 0.7);
  col += (hash(gl_FragCoord.xy + fract(uTime * 7.0) * 100.0) - 0.5) * (0.02 + 0.05 * uGrain);

  gl_FragColor = vec4(col, 1.0);
}
`;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Full-screen generative sky rendered with WebGL. Falls back to the CSS mesh when
 * WebGL isn't available, and renders one still frame for reduced-motion users.
 */
export function Aura({ params, veil = 0.35 }: { params: AuraParams; veil?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify(params);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!canvas || !gl) {
      setFailed(true);
      return;
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link");
    } catch (e) {
      console.warn("Aura disabled:", e);
      setFailed(true);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const p: AuraParams = JSON.parse(key);
    p.colors.forEach((c, i) => gl.uniform3fv(u(`uC${i}`), rgb(c)));
    gl.uniform3fv(u("uBg"), rgb(p.background));
    gl.uniform1f(u("uSeed"), p.seed);
    gl.uniform1f(u("uSpeed"), p.speed);
    gl.uniform1f(u("uWarp"), p.warp);
    gl.uniform1f(u("uNebula"), p.nebula);
    gl.uniform1f(u("uAurora"), p.aurora);
    gl.uniform1f(u("uStars"), p.stars);
    gl.uniform1f(u("uGlow"), p.glow);
    gl.uniform1f(u("uRipple"), p.ripple);
    gl.uniform1f(u("uGrain"), p.grain);
    gl.uniform1f(u("uLight"), p.light);
    const uRes = u("uRes");
    const uTime = u("uTime");

    // The sky is soft, so render below native resolution and let CSS scale it up.
    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1) * 0.6;
      canvas.width = Math.max(1, Math.round(window.innerWidth * scale));
      canvas.height = Math.max(1, Math.round(window.innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now() - (p.seed % 100) * 1000;
    let frame = 0;
    let last = 0;
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - last < 33 || document.hidden) return; // ~30fps is plenty for a drifting sky
      last = now;
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const drawOnce = () => {
      gl.uniform1f(uTime, 40 + (p.seed % 50));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    if (still) drawOnce();
    else frame = requestAnimationFrame(draw);
    const onResize = () => {
      resize();
      if (still) drawOnce();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [key]);

  if (failed) return <Mesh />;

  return (
    <div aria-hidden className="fixed inset-0 -z-10" style={{ background: params.background }}>
      <canvas ref={canvasRef} className="h-full w-full" />
      <div
        className="absolute inset-0"
        style={{
          background:
            params.light > 0.5
              ? `linear-gradient(to bottom, rgb(255 255 255 / ${veil * 0.15}), rgb(255 255 255 / ${veil * 0.55}))`
              : `linear-gradient(to bottom, rgb(0 0 0 / ${veil * 0.3}), rgb(0 0 0 / ${veil}))`,
        }}
      />
    </div>
  );
}
