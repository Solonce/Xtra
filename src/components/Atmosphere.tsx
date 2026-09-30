"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Effect, Env, Extras } from "@/effects/core";
import { EFFECTS } from "@/effects";
import type { ActiveEffect } from "@/lib/vibes";

type Toast = { id: number; text: string; x: number; y: number };

const INTERACTIVE = "a, button, input, textarea, select, label, summary, [data-no-fx]";
const STORAGE_KEY = "xtra:fx";

// The viewer's on/off preference, kept in localStorage and shared across tabs.
const listeners = new Set<() => void>();
const prefStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    window.addEventListener("storage", fn);
    return () => {
      listeners.delete(fn);
      window.removeEventListener("storage", fn);
    };
  },
  get() {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "off";
    } catch {
      return true;
    }
  },
  set(on: boolean) {
    try {
      localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    } catch {
      /* storage unavailable */
    }
    listeners.forEach((fn) => fn());
  },
};

/**
 * Runs the taste-driven page effects (rain, demons, bats…) on two full-screen canvases:
 * one behind the content and one in front of it. Neither catches pointer events; clicks
 * on the page background are routed to the effects instead.
 */
export function Atmosphere({
  effects,
  colors,
  accent,
  light,
  extras,
}: {
  effects: ActiveEffect[];
  colors: string[];
  accent: string;
  light: boolean;
  extras: Extras;
}) {
  const backRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const enabled = useSyncExternalStore(prefStore.subscribe, prefStore.get, () => true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const key = JSON.stringify({ effects, colors, accent, light, extras });

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const back = backRef.current, front = frontRef.current;
    const bg = back?.getContext("2d"), fg = front?.getContext("2d");
    if (!back || !front || !bg || !fg) return;

    const props = JSON.parse(key) as { effects: ActiveEffect[]; colors: string[]; accent: string; light: boolean; extras: Extras };
    let toastId = 0;
    const env: Env = {
      w: window.innerWidth,
      h: window.innerHeight,
      t: 0,
      dt: 0,
      pointer: { x: -999, y: -999, vx: 0, vy: 0, inside: false, down: false },
      colors: props.colors,
      accent: props.accent,
      light: props.light,
      intensity: 1,
      extras: props.extras,
      say: (text, x, y) => {
        const id = ++toastId;
        setToasts((ts) => [...ts.slice(-4), { id, text, x, y }]);
        setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 1800);
      },
    };

    // Each effect gets its own view of env with its intensity.
    const running: { fx: Effect; env: Env }[] = props.effects.flatMap((a) => {
      const factory = EFFECTS[a.id];
      if (!factory) return [];
      const own = Object.create(env) as Env;
      own.intensity = a.intensity;
      try {
        return [{ fx: factory(own), env: own }];
      } catch (e) {
        console.warn("effect failed to start", a.id, e);
        return [];
      }
    });

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      env.w = window.innerWidth;
      env.h = window.innerHeight;
      for (const c of [back, front]) {
        c.width = Math.round(env.w * dpr);
        c.height = Math.round(env.h * dpr);
      }
    };
    resize();

    let last = performance.now();
    let lastMove = { x: 0, y: 0, t: last };
    let frame = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (document.hidden) {
        last = now;
        return;
      }
      // rAF timestamps can precede performance.now() taken at setup, so clamp at 0.
      env.dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      env.t += env.dt;
      last = now;
      // Pointer velocity decays when the mouse stops.
      env.pointer.vx *= 0.9;
      env.pointer.vy *= 0.9;
      for (const [g] of [[bg], [fg]] as const) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, env.w, env.h);
      }
      for (const { fx, env: own } of running) {
        own.dt = env.dt;
        try {
          fx.update(own);
          fx.draw(fx.layer === "back" ? bg : fg, own);
        } catch (e) {
          console.warn("effect crashed", e);
        }
      }
    };
    frame = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(1, now - lastMove.t) / 1000;
      env.pointer.vx = (e.clientX - lastMove.x) / dt;
      env.pointer.vy = (e.clientY - lastMove.y) / dt;
      env.pointer.x = e.clientX;
      env.pointer.y = e.clientY;
      env.pointer.inside = true;
      lastMove = { x: e.clientX, y: e.clientY, t: now };
    };
    const onLeave = () => (env.pointer.inside = false);
    const onDown = (e: PointerEvent) => {
      onMove(e);
      env.pointer.down = true;
      if ((e.target as Element | null)?.closest?.(INTERACTIVE)) return;
      if (window.getSelection()?.toString()) return;
      for (const { fx, env: own } of running) {
        if (fx.press?.(e.clientX, e.clientY, own)) {
          e.preventDefault();
          return;
        }
      }
      for (const { fx, env: own } of running) if (fx.click?.(e.clientX, e.clientY, own)) break;
    };
    const onUp = () => {
      env.pointer.down = false;
      for (const { fx, env: own } of running) fx.release?.(own);
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      bg.clearRect(0, 0, back.width, back.height);
      fg.clearRect(0, 0, front.width, front.height);
    };
  }, [key, enabled]);

  if (!effects.length) return null;

  const toggle = () => prefStore.set(!enabled);

  return (
    <>
      <canvas ref={backRef} aria-hidden className="pointer-events-none fixed inset-0 -z-[5] h-full w-full" />
      <canvas ref={frontRef} aria-hidden className="pointer-events-none fixed inset-0 z-30 h-full w-full" />
      {toasts.map((t) => (
        <span
          key={t.id}
          className="fx-toast pointer-events-none fixed z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-3 py-1 font-display text-lg italic text-white"
          style={{ left: t.x, top: t.y }}
        >
          {t.text}
        </span>
      ))}
      <button
        onClick={toggle}
        data-no-fx
        className="glass fixed bottom-4 left-4 z-40 rounded-full px-3 py-1.5 text-xs text-muted transition hover:text-fg"
        title={enabled ? "Turn page effects off" : "Turn page effects on"}
      >
        {enabled ? `✦ ${effects.length} effects` : "✧ effects off"}
      </button>
    </>
  );
}
