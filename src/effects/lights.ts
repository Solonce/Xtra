import {
  burst, clamp, density, drawGlow, drawSparks, type Factory, glow, pick, rand, rgba, type Spark,
  stepSparks, TAU,
} from "./core";

/** Dreamy: big out-of-focus lights; click one to pop it into shimmer. */
export const bokeh: Factory = (env) => {
  const make = () => ({
    x: rand(0, env.w), y: rand(0, env.h), r: rand(24, 90), vx: rand(-8, 8), vy: rand(-10, -3),
    color: pick(env.colors.slice(0, 3)), p: rand(0, TAU), grow: 0,
  });
  const orbs = Array.from({ length: density(env, 16) }, make);
  const sparks: Spark[] = [];
  return {
    layer: "back",
    update({ dt, w, h }) {
      for (const o of orbs) {
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.grow = Math.min(1, o.grow + dt * 0.5);
        if (o.y < -o.r) Object.assign(o, { y: h + o.r, x: rand(0, w) });
        if (o.x < -o.r) o.x = w + o.r;
        if (o.x > w + o.r) o.x = -o.r;
      }
      stepSparks(sparks, dt, 40);
    },
    draw(g, { t }) {
      g.save();
      g.globalCompositeOperation = "lighter";
      for (const o of orbs) {
        const a = (0.16 + 0.08 * Math.sin(t * 0.6 + o.p)) * o.grow;
        g.globalAlpha = a;
        g.drawImage(glow(o.color, 48), o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
        g.strokeStyle = rgba(o.color, a * 1.2);
        g.beginPath();
        g.arc(o.x, o.y, o.r * 0.62, 0, TAU);
        g.stroke();
      }
      g.globalAlpha = 1;
      drawSparks(g, sparks);
      g.restore();
    },
    click(x, y, env) {
      for (const o of orbs) {
        if (Math.hypot(x - o.x, y - o.y) < o.r * 0.7) {
          burst(sparks, o.x, o.y, 22, [o.color, "#ffffff"], 160, 2.5);
          Object.assign(o, make(), { y: env.h + 90, grow: 0 });
          return true;
        }
      }
      return false;
    },
  };
};

/** Club: laser beams sweeping from the floor. Click to drop the beat. */
export const lasers: Factory = (env) => {
  const beams = Array.from({ length: clamp(Math.round(3 + env.intensity * 4), 3, 7) }, (_, i) => ({
    origin: i % 2 ? 1 : 0, speed: rand(0.2, 0.6), phase: rand(0, TAU), color: env.colors[i % 3] ?? "#2de2e6",
  }));
  let drop = 0;
  return {
    layer: "back",
    update({ dt }) {
      drop = Math.max(0, drop - dt);
    },
    draw(g, { w, h, t }) {
      g.save();
      g.globalCompositeOperation = "lighter";
      const strobe = drop > 0 ? (Math.sin(t * 40) > 0 ? 1 : 0.2) : 1;
      for (const b of beams) {
        const ox = b.origin ? w + 20 : -20;
        const oy = h + 20;
        const speed = drop > 0 ? b.speed * 6 : b.speed;
        const base = b.origin ? -Math.PI * 0.72 : -Math.PI * 0.28;
        const angle = base + Math.sin(t * speed + b.phase) * 0.45;
        const len = Math.hypot(w, h) * 1.3;
        const ex = ox + Math.cos(angle) * len, ey = oy + Math.sin(angle) * len;
        for (const [width, a] of [[8, 0.035], [1.5, 0.16]] as const) {
          g.strokeStyle = rgba(b.color, a * strobe * (0.5 + env.intensity * 0.5) * (drop > 0 ? 1.8 : 1));
          g.lineWidth = width;
          g.beginPath();
          g.moveTo(ox, oy);
          g.lineTo(ex, ey);
          g.stroke();
        }
      }
      if (drop > 0) {
        g.fillStyle = rgba(env.colors[1] ?? "#ff5ca8", drop * 0.05 * strobe);
        g.fillRect(0, 0, w, h);
      }
      g.restore();
    },
    click() {
      drop = 1.8;
      return false;
    },
  };
};

/** Funk & disco: a mirror ball casting specks of light that sweep across the page. */
export const disco: Factory = (env) => {
  const specks = Array.from({ length: density(env, 70) }, () => ({ a: rand(0, TAU), r: rand(0.15, 1.1), s: rand(3, 7), c: pick(["#ffffff", ...env.colors.slice(0, 3)]) }));
  return {
    layer: "front",
    update() {},
    draw(g, { w, h, t }) {
      const cx = w / 2, cy = -20;
      const ballR = 26;
      g.save();
      g.globalCompositeOperation = "lighter";
      const spin = t * 0.25;
      for (const s of specks) {
        const a = s.a + spin;
        const x = cx + Math.cos(a) * s.r * w * 0.7;
        const y = cy + Math.abs(Math.sin(a)) * s.r * h + 40;
        g.globalAlpha = 0.3 * (0.6 + 0.4 * Math.sin(t * 5 + s.a * 9));
        g.fillStyle = s.c;
        g.beginPath();
        g.ellipse(x, y, s.s * 1.6, s.s, a, 0, TAU);
        g.fill();
      }
      g.restore();
      // the ball
      const grad = g.createRadialGradient(cx - 8, cy + 14, 2, cx, cy + 10, ballR);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(1, "#7d7d8a");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(cx, cy + 10, ballR, 0, TAU);
      g.fill();
      g.strokeStyle = "rgba(0,0,0,0.25)";
      for (let i = -ballR; i < ballR; i += 7) {
        g.beginPath();
        g.moveTo(cx - ballR, cy + 10 + i);
        g.lineTo(cx + ballR, cy + 10 + i);
        g.stroke();
      }
    },
  };
};

type Lantern = { x: number; y: number; v: number; sway: number; p: number; size: number; life: number };

/** R&B & soul: warm paper lanterns floating up; click to release your own. */
export const lanterns: Factory = (env) => {
  const list: Lantern[] = [];
  const add = (x: number, y: number) => list.push({ x, y, v: rand(18, 34), sway: rand(6, 16), p: rand(0, TAU), size: rand(7, 13), life: 1 });
  for (let i = 0; i < density(env, 10); i++) add(rand(0, env.w), rand(0, env.h));
  let next = 0;
  return {
    layer: "back",
    update({ dt, t, w, h }) {
      if ((next -= dt) <= 0) {
        add(rand(0, w), h + 20);
        next = rand(2, 5) / env.intensity;
      }
      for (let i = list.length - 1; i >= 0; i--) {
        const l = list[i];
        l.y -= l.v * dt;
        l.x += Math.sin(t * 0.5 + l.p) * l.sway * dt;
        if (l.y < -40) list.splice(i, 1);
      }
    },
    draw(g, { t, h }) {
      for (const l of list) {
        const flicker = 0.8 + 0.2 * Math.sin(t * 9 + l.p);
        const fade = clamp(l.y / (h * 0.4), 0.15, 1);
        drawGlow(g, "#ffb35c", l.x, l.y, l.size * 4, 0.55 * flicker * fade);
        g.fillStyle = rgba("#ffcf8a", 0.9 * fade);
        g.beginPath();
        g.roundRect(l.x - l.size * 0.55, l.y - l.size * 0.7, l.size * 1.1, l.size * 1.4, 3);
        g.fill();
      }
    },
    click(x, y) {
      add(x, y);
      return false;
    },
  };
};

/** Psychedelic: slow lava-lamp blobs that merge where they overlap. */
export const lava: Factory = (env) => {
  const blobs = Array.from({ length: 7 }, (_, i) => ({
    x: rand(0.05, 0.95), r: rand(70, 150), speed: rand(0.04, 0.09), p: rand(0, TAU), color: env.colors[i % 3],
  }));
  return {
    layer: "back",
    update() {},
    draw(g, { w, h, t }) {
      g.save();
      g.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        const y = h * (0.5 + 0.55 * Math.sin(t * b.speed * TAU * 0.3 + b.p));
        const x = w * b.x + Math.sin(t * 0.2 + b.p) * 40;
        const r = b.r * (1 + 0.15 * Math.sin(t * 0.7 + b.p));
        g.globalAlpha = 0.3 * env.intensity + 0.15;
        g.drawImage(glow(b.color, 64), x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2);
      }
      g.restore();
    },
  };
};

type Streak = { x: number; y: number; vx: number; vy: number; life: number };

/** Ambient & post-rock: shooting stars; click to send one and make a wish. */
export const shootingStars: Factory = (env) => {
  const list: Streak[] = [];
  let next = rand(1, 4);
  let wished = false;
  const launch = (x: number, y: number) => {
    const angle = rand(0.3, 0.75); // radians below the horizon
    const dir = Math.random() < 0.5 ? 1 : -1;
    const v = rand(700, 1100);
    list.push({ x, y, vx: Math.cos(angle) * v * dir, vy: Math.sin(angle) * v, life: 1 });
  };
  return {
    layer: "back",
    update({ dt, w, h }) {
      if ((next -= dt) <= 0) {
        launch(rand(0, w), rand(0, h * 0.35));
        next = rand(3, 9) / env.intensity;
      }
      for (let i = list.length - 1; i >= 0; i--) {
        const s = list[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if ((s.life -= dt * 0.9) <= 0) list.splice(i, 1);
      }
    },
    draw(g) {
      g.lineCap = "round";
      for (const s of list) {
        const len = 0.09;
        const grad = g.createLinearGradient(s.x, s.y, s.x - s.vx * len, s.y - s.vy * len);
        grad.addColorStop(0, `rgba(255,255,255,${s.life})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        g.strokeStyle = grad;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(s.x, s.y);
        g.lineTo(s.x - s.vx * len, s.y - s.vy * len);
        g.stroke();
        drawGlow(g, "#ffffff", s.x, s.y, 6, s.life);
      }
    },
    click(x, y, env) {
      launch(x, y);
      if (!wished) {
        wished = true;
        env.say("make a wish", x, y - 20);
      }
      return false;
    },
  };
};

/** Pop: glittering stars trail the cursor. */
export const sparkles: Factory = (env) => {
  const list: { x: number; y: number; vy: number; life: number; size: number; color: string; rot: number }[] = [];
  let acc = 0;
  const star = (g: CanvasRenderingContext2D, s: number) => {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? s * 0.3 : s;
      const a = (i / 8) * TAU;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.fill();
  };
  return {
    layer: "front",
    update({ dt, pointer, w, h }) {
      const moving = Math.hypot(pointer.vx, pointer.vy);
      acc += dt * (pointer.inside && moving > 30 ? 60 * env.intensity : 0) + dt * 1.5 * env.intensity;
      while (acc >= 1) {
        acc -= 1;
        const trail = pointer.inside && moving > 30;
        list.push({
          x: trail ? pointer.x + rand(-8, 8) : rand(0, w),
          y: trail ? pointer.y + rand(-8, 8) : rand(0, h),
          vy: rand(10, 60), life: 1, size: rand(2.5, 6), color: pick(["#ffffff", ...env.colors.slice(0, 3)]), rot: rand(0, TAU),
        });
      }
      for (let i = list.length - 1; i >= 0; i--) {
        const s = list[i];
        s.y += s.vy * dt;
        s.rot += dt * 2;
        if ((s.life -= dt * 1.1) <= 0) list.splice(i, 1);
      }
      if (list.length > 300) list.splice(0, list.length - 300);
    },
    draw(g) {
      for (const s of list) {
        g.save();
        g.translate(s.x, s.y);
        g.rotate(s.rot);
        g.globalAlpha = s.life;
        g.fillStyle = s.color;
        star(g, s.size * (0.5 + 0.5 * s.life));
        g.restore();
      }
      g.globalAlpha = 1;
    },
  };
};

/** Punk & hardcore: embers rising like a pit's worth of sparks; swipe through them. */
export const embers: Factory = (env) => {
  const make = (y?: number) => ({ x: rand(0, env.w), y: y ?? rand(0, env.h), vx: 0, vy: -rand(30, 90), size: rand(1, 2.6), p: rand(0, TAU), heat: rand(0.5, 1) });
  const list = Array.from({ length: density(env, 70) }, () => make());
  return {
    layer: "front",
    update({ dt, t, h, pointer }) {
      for (const e of list) {
        if (pointer.inside) {
          const dx = e.x - pointer.x, dy = e.y - pointer.y, d = Math.hypot(dx, dy);
          if (d < 110) {
            e.vx += pointer.vx * 0.04 * (1 - d / 110);
            e.vy += pointer.vy * 0.04 * (1 - d / 110);
          }
        }
        e.vx = e.vx * 0.96 + Math.sin(t * 2 + e.p) * 6 * dt;
        e.vy = e.vy * 0.99 - 10 * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.heat -= dt * 0.08;
        if (e.y < -10 || e.heat <= 0) Object.assign(e, make(h + 10));
      }
    },
    draw(g, { t }) {
      for (const e of list) {
        const flick = 0.7 + 0.3 * Math.sin(t * 12 + e.p);
        drawGlow(g, e.heat > 0.6 ? "#ffb13b" : "#ff4d1f", e.x, e.y, e.size * 5, 0.5 * e.heat * flick);
        g.fillStyle = `rgba(255,${Math.round(150 + 90 * e.heat)},90,${e.heat})`;
        g.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
      }
    },
  };
};

let serifFamily: string | null = null;
const serif = () =>
  (serifFamily ??= getComputedStyle(document.documentElement).getPropertyValue("--font-instrument-serif").trim() || "serif");

/**
 * Explorer: your top artists as a constellation. Hover a star to see who it is; the
 * layout is the same every visit because it's seeded from the names.
 */
export const constellation: Factory = (env) => {
  const names = env.extras.constellation.slice(0, 16);
  const hash = (s: string, k: number) => {
    let h = 2166136261 ^ k;
    for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return ((h >>> 0) % 10000) / 10000;
  };
  const stars = names.map((name, i) => ({ name, u: 0.04 + 0.92 * hash(name, 1), v: 0.08 + 0.8 * hash(name, 2), size: 3.2 - (i / names.length) * 1.6 }));
  const edges: [number, number][] = [];
  stars.forEach((s, i) => {
    const nearest = stars
      .map((o, j) => ({ j, d: Math.hypot(o.u - s.u, (o.v - s.v) * 0.6) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const n of nearest) if (!edges.some(([a, b]) => (a === n.j && b === i) || (a === i && b === n.j))) edges.push([i, n.j]);
  });
  let hover = -1;
  return {
    layer: "front",
    update({ pointer, w, h }) {
      hover = -1;
      if (!pointer.inside) return;
      stars.forEach((s, i) => {
        if (Math.hypot(pointer.x - s.u * w, pointer.y - s.v * h) < 22) hover = i;
      });
    },
    draw(g, { w, h, t, colors }) {
      g.lineWidth = 1;
      for (const [a, b] of edges) {
        const lit = hover === a || hover === b;
        g.strokeStyle = rgba(colors[2] ?? "#ffffff", lit ? 0.45 : 0.08);
        g.beginPath();
        g.moveTo(stars[a].u * w, stars[a].v * h);
        g.lineTo(stars[b].u * w, stars[b].v * h);
        g.stroke();
      }
      stars.forEach((s, i) => {
        const x = s.u * w, y = s.v * h;
        const tw = 0.6 + 0.4 * Math.sin(t * 1.3 + i);
        drawGlow(g, colors[2] ?? "#ffffff", x, y, s.size * (hover === i ? 8 : 4), (hover === i ? 0.9 : 0.35) * tw);
        g.fillStyle = "rgba(255,255,255,0.9)";
        g.beginPath();
        g.arc(x, y, s.size * 0.6, 0, TAU);
        g.fill();
      });
      if (hover >= 0) {
        const s = stars[hover];
        const x = s.u * w, y = s.v * h;
        g.font = `italic 22px ${serif()}`;
        const label = s.name;
        const m = g.measureText(label).width;
        const lx = clamp(x + 14, 8, w - m - 16);
        g.fillStyle = "rgba(0,0,0,0.55)";
        g.beginPath();
        g.roundRect(lx - 8, y - 30, m + 16, 30, 15);
        g.fill();
        g.fillStyle = "#fff";
        g.fillText(label, lx, y - 9);
      }
    },
  };
};
