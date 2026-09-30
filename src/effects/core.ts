// Shared plumbing for the page effects in this folder. Every effect is a small object
// that updates and draws itself on one of two full-screen canvases: "back" (behind the
// page content, above the sky) or "front" (over the content, never catching clicks).

import { hexToRgb } from "@/lib/color";

export type Pointer = { x: number; y: number; vx: number; vy: number; inside: boolean; down: boolean };

export type Extras = {
  constellation: string[];
  vinylCover: string | null;
  vinylTitle: string | null;
};

export type Env = {
  w: number;
  h: number;
  t: number; // seconds since start
  dt: number; // seconds since last frame (capped)
  pointer: Pointer;
  colors: string[];
  accent: string;
  light: boolean;
  intensity: number;
  extras: Extras;
  /** Floating text at a point, e.g. "demon slain ×3". */
  say: (text: string, x: number, y: number) => void;
};

export interface Effect {
  layer: "back" | "front";
  update(env: Env): void;
  draw(g: CanvasRenderingContext2D, env: Env): void;
  /** A click on the page background. Return true to stop other effects reacting. */
  click?(x: number, y: number, env: Env): boolean;
  /** Pointer pressed; return true to capture the drag (the page won't select text). */
  press?(x: number, y: number, env: Env): boolean;
  release?(env: Env): void;
}

export type Factory = (env: Env) => Effect;

export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const TAU = Math.PI * 2;

export function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Scales particle counts with screen area so phones don't get a blizzard. */
export function density(env: Env, base: number) {
  return Math.max(3, Math.round(base * env.intensity * Math.min(1.4, (env.w * env.h) / (1440 * 900))));
}

const sprites = new Map<string, HTMLCanvasElement>();

/** A cached soft radial glow, drawn with drawImage — far cheaper than shadowBlur. */
export function glow(color: string, radius = 32) {
  const key = `${color}|${radius}`;
  let c = sprites.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = c.height = radius * 2;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(radius, radius, 0, radius, radius, radius);
    grad.addColorStop(0, rgba(color, 1));
    grad.addColorStop(0.25, rgba(color, 0.55));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, radius * 2, radius * 2);
    sprites.set(key, c);
  }
  return c;
}

export function drawGlow(g: CanvasRenderingContext2D, color: string, x: number, y: number, size: number, alpha = 1) {
  g.globalAlpha = alpha;
  g.drawImage(glow(color), x - size, y - size, size * 2, size * 2);
  g.globalAlpha = 1;
}

/** Short-lived particles (bursts, splashes). */
export type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string };

export function burst(list: Spark[], x: number, y: number, n: number, colors: string[], speed = 260, size = 3) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU);
    const v = rand(0.3, 1) * speed;
    const max = rand(0.5, 1.1);
    list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life: max, max, size: rand(0.5, 1) * size, color: pick(colors) });
  }
}

export function stepSparks(list: Spark[], dt: number, gravity = 500) {
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    s.life -= dt;
    if (s.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    s.vy += gravity * dt;
    s.vx *= 0.98;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
  }
}

export function drawSparks(g: CanvasRenderingContext2D, list: Spark[], glowing = true) {
  for (const s of list) {
    const a = s.life / s.max;
    if (glowing) drawGlow(g, s.color, s.x, s.y, s.size * 4, a * 0.7);
    g.globalAlpha = a;
    g.fillStyle = s.color;
    g.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
  }
  g.globalAlpha = 1;
}

let audio: AudioContext | null = null;

/** Lazily-created audio context; only ever used in response to a click. */
export function audioContext() {
  if (typeof window === "undefined") return null;
  audio ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return audio;
}

export function tone(freq: number, duration = 1.2, type: OscillatorType = "sine", volume = 0.08) {
  const ctx = audioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function noiseBurst(duration = 0.12, volume = 0.05, filterFreq = 1800) {
  const ctx = audioContext();
  if (!ctx) return;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
}

export function counter(key: string) {
  try {
    const n = Number(localStorage.getItem(key) ?? 0) + 1;
    localStorage.setItem(key, String(n));
    return n;
  } catch {
    return 1;
  }
}
