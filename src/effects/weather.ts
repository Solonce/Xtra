import { clamp, density, drawGlow, type Env, type Factory, glow as glowCanvas, pick, rand, rgba, TAU } from "./core";

type Ripple = { x: number; y: number; r: number; life: number };

/** Melancholy: rain streaks and a puddle along the bottom that ripples under the cursor. */
export const rain: Factory = (env) => {
  const drops = Array.from({ length: density(env, 170) }, () => ({
    x: rand(0, env.w), y: rand(-env.h, env.h), len: rand(10, 24), v: rand(650, 1050),
  }));
  const ripples: Ripple[] = [];
  let lastRipple = 0;
  const puddle = () => Math.min(110, env.h * 0.14);

  return {
    layer: "front",
    update({ w, h, dt, pointer, t }) {
      const wind = clamp(pointer.vx / 3000, -0.35, 0.35) + 0.08;
      const top = h - puddle();
      for (const d of drops) {
        d.y += d.v * dt;
        d.x += d.v * wind * dt;
        const landAt = top + ((d.x * 7) % puddle());
        if (d.y > landAt) {
          if (Math.random() < 0.3) ripples.push({ x: d.x, y: landAt, r: 1, life: 1 });
          d.y = rand(-80, -10);
          d.x = rand(-w * 0.1, w);
        }
      }
      if (pointer.inside && pointer.y > top && t - lastRipple > 0.06 && Math.hypot(pointer.vx, pointer.vy) > 20) {
        ripples.push({ x: pointer.x, y: pointer.y, r: 2, life: 1.6 });
        lastRipple = t;
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.life -= dt * 0.9;
        r.r += dt * 45;
        if (r.life <= 0) ripples.splice(i, 1);
      }
      if (ripples.length > 160) ripples.splice(0, ripples.length - 160);
    },
    draw(g, { w, h, colors, light }) {
      const top = h - puddle();
      const pool = g.createLinearGradient(0, top, 0, h);
      pool.addColorStop(0, rgba(colors[0], 0));
      pool.addColorStop(1, rgba(colors[0], light ? 0.18 : 0.22));
      g.fillStyle = pool;
      g.fillRect(0, top, w, h - top);

      g.strokeStyle = light ? "rgba(40,60,90,0.25)" : "rgba(200,220,255,0.22)";
      g.lineWidth = 1;
      g.beginPath();
      for (const d of drops) {
        g.moveTo(d.x, d.y);
        g.lineTo(d.x - d.len * 0.12, d.y - d.len);
      }
      g.stroke();

      for (const r of ripples) {
        g.strokeStyle = light ? `rgba(40,60,90,${r.life * 0.3})` : `rgba(210,225,255,${r.life * 0.35})`;
        g.beginPath();
        g.ellipse(r.x, r.y, r.r, r.r * 0.28, 0, 0, TAU);
        g.stroke();
      }
    },
  };
};

/** Dreamy: slow snow that swirls around the cursor and drifts into a bank along the bottom. */
export const snow: Factory = (env) => {
  const flakes = Array.from({ length: density(env, 90) }, () => ({
    x: rand(0, env.w), y: rand(0, env.h), r: rand(0.8, 2.6), v: rand(18, 45), phase: rand(0, TAU),
  }));
  const COLS = 96;
  const bank = new Float32Array(COLS);
  return {
    layer: "front",
    update({ w, h, dt, t, pointer }) {
      for (const f of flakes) {
        f.y += f.v * dt;
        f.x += Math.sin(t * 0.8 + f.phase) * 12 * dt;
        if (pointer.inside) {
          const dx = f.x - pointer.x, dy = f.y - pointer.y, d = Math.hypot(dx, dy);
          if (d < 90 && d > 0) {
            f.x += (dx / d) * (90 - d) * dt * 2 + (-dy / d) * 40 * dt;
            f.y += (dy / d) * (90 - d) * dt;
          }
        }
        const col = clamp(Math.floor((f.x / w) * COLS), 0, COLS - 1);
        if (f.y > h - bank[col]) {
          bank[col] = Math.min(28, bank[col] + f.r * 0.35);
          f.y = rand(-40, -5);
          f.x = rand(0, w);
        }
      }
      for (let i = 0; i < COLS; i++) bank[i] = Math.max(0, bank[i] - dt * 0.25);
    },
    draw(g, { w, h, light }) {
      g.fillStyle = light ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.75)";
      for (const f of flakes) {
        g.beginPath();
        g.arc(f.x, f.y, f.r, 0, TAU);
        g.fill();
      }
      g.fillStyle = light ? "rgba(255,255,255,0.85)" : "rgba(235,240,255,0.5)";
      g.beginPath();
      g.moveTo(0, h);
      for (let i = 0; i < COLS; i++) g.lineTo((i / (COLS - 1)) * w, h - bank[i]);
      g.lineTo(w, h);
      g.fill();
    },
  };
};

type Bolt = { path: [number, number][]; branches: [number, number][][]; life: number };

function makeBolt(x0: number, y0: number, x1: number, y1: number): Bolt {
  const path: [number, number][] = [[x0, y0]];
  const branches: [number, number][][] = [];
  const steps = 18;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t + (i < steps ? rand(-28, 28) : 0);
    const y = y0 + (y1 - y0) * t;
    path.push([x, y]);
    if (Math.random() < 0.18 && i < steps - 2) {
      const b: [number, number][] = [[x, y]];
      let bx = x, by = y;
      for (let j = 0; j < 5; j++) b.push([(bx += rand(-30, 30)), (by += rand(12, 30))]);
      branches.push(b);
    }
  }
  return { path, branches, life: 0.45 };
}

/** Metal: distant flashes and forked lightning; click the sky to call a strike. */
export const lightning: Factory = (env) => {
  const bolts: Bolt[] = [];
  let flash = 0;
  let next = rand(6, 14) / env.intensity;
  let cooldown = 0;
  const strike = (x: number, y: number) => {
    bolts.push(makeBolt(x + rand(-120, 120), 0, x, y));
    flash = 1;
  };
  return {
    layer: "front",
    update({ dt, w, h }) {
      next -= dt;
      cooldown -= dt;
      if (next <= 0) {
        strike(rand(0, w), rand(h * 0.3, h * 0.65));
        next = rand(10, 28) / env.intensity;
      }
      flash = Math.max(0, flash - dt * 3.5);
      for (let i = bolts.length - 1; i >= 0; i--) if ((bolts[i].life -= dt) <= 0) bolts.splice(i, 1);
    },
    draw(g, { w, h, colors }) {
      if (flash > 0) {
        g.fillStyle = `rgba(230,235,255,${flash * 0.12})`;
        g.fillRect(0, 0, w, h);
      }
      g.lineCap = "round";
      for (const b of bolts) {
        const a = b.life / 0.45;
        for (const [width, color] of [[7, rgba(colors[1] ?? "#9bb4ff", 0.25 * a)], [2, `rgba(255,255,255,${a})`]] as const) {
          g.strokeStyle = color;
          g.lineWidth = width;
          for (const line of [b.path, ...b.branches]) {
            g.beginPath();
            line.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
            g.stroke();
          }
        }
      }
    },
    click(x, y) {
      if (cooldown > 0) return false;
      cooldown = 1.2;
      strike(x, y);
      return false;
    },
  };
};

type Leaf = { x: number; y: number; vx: number; vy: number; rot: number; spin: number; size: number; color: string; phase: number };

function fallers(env: Env, n: number, palette: string[]): Leaf[] {
  return Array.from({ length: n }, () => ({
    x: rand(0, env.w), y: rand(-env.h, env.h), vx: 0, vy: rand(25, 60), rot: rand(0, TAU),
    spin: rand(-1.5, 1.5), size: rand(6, 12), color: pick(palette), phase: rand(0, TAU),
  }));
}

function stepFallers(list: Leaf[], env: Env, sway: number) {
  const { dt, t, w, h, pointer } = env;
  for (const l of list) {
    l.vx *= 0.97;
    if (pointer.inside) {
      const dx = l.x - pointer.x, dy = l.y - pointer.y, d = Math.hypot(dx, dy);
      if (d < 120) l.vx += pointer.vx * 0.02 * (1 - d / 120);
    }
    l.x += (Math.sin(t + l.phase) * sway + l.vx) * dt;
    l.y += l.vy * dt;
    l.rot += l.spin * dt;
    if (l.y > h + 20 || l.x < -40 || l.x > w + 40) {
      l.y = rand(-60, -10);
      l.x = rand(0, w);
      l.vx = 0;
    }
  }
}

/** Folk: autumn leaves; click to send a gust through them. */
export const leaves: Factory = (env) => {
  const palette = ["#c8642a", "#d9a23b", "#8a3b1e", "#6b7a2f", env.colors[0]];
  const list = fallers(env, density(env, 18), palette);
  return {
    layer: "front",
    update: (e) => stepFallers(list, e, 40),
    draw(g) {
      for (const l of list) {
        g.save();
        g.translate(l.x, l.y);
        g.rotate(l.rot);
        g.fillStyle = rgba(l.color, 0.75);
        g.beginPath();
        g.moveTo(0, -l.size);
        g.quadraticCurveTo(l.size * 0.9, 0, 0, l.size);
        g.quadraticCurveTo(-l.size * 0.9, 0, 0, -l.size);
        g.fill();
        g.strokeStyle = "rgba(0,0,0,0.25)";
        g.beginPath();
        g.moveTo(0, -l.size);
        g.lineTo(0, l.size);
        g.stroke();
        g.restore();
      }
    },
    click(x, y) {
      for (const l of list) {
        const dx = l.x - x, dy = l.y - y, d = Math.hypot(dx, dy) || 1;
        if (d < 300) {
          l.vx += (dx / d) * 400 * (1 - d / 300);
          l.spin += rand(-4, 4);
        }
      }
      return false;
    },
  };
};

/** K-pop / J-pop / anime: cherry-blossom petals riding the cursor's breeze. */
export const petals: Factory = (env) => {
  const list = fallers(env, density(env, 28), ["#ffc2d6", "#ffb3c9", "#ffe0ea", env.colors[1] ?? "#ff9fc0"]);
  return {
    layer: "front",
    update: (e) => stepFallers(list, e, 55),
    draw(g) {
      for (const l of list) {
        g.save();
        g.translate(l.x, l.y);
        g.rotate(l.rot);
        g.scale(1, 0.55 + 0.45 * Math.sin(l.rot * 2));
        g.fillStyle = rgba(l.color, 0.85);
        g.beginPath();
        g.ellipse(0, 0, l.size * 0.7, l.size * 0.45, 0, 0, TAU);
        g.fill();
        g.restore();
      }
    },
  };
};

/** Country: a tumbleweed rolls through now and then; click it to make it bounce. */
export const tumbleweed: Factory = (env) => {
  const weed = { x: -100, y: 0, vx: 0, vy: 0, rot: 0, active: false, r: 22 };
  let wait = rand(3, 8);
  const lines = Array.from({ length: 26 }, () => [rand(0, TAU), rand(0.3, 1), rand(0, TAU), rand(0.3, 1)]);
  return {
    layer: "front",
    update({ dt, w, h }) {
      const ground = h - weed.r - 4;
      if (!weed.active) {
        if ((wait -= dt) <= 0) Object.assign(weed, { active: true, x: -60, y: ground, vx: rand(120, 220) * (0.6 + env.intensity), vy: 0 });
        return;
      }
      weed.vy += 900 * dt;
      weed.x += weed.vx * dt;
      weed.y += weed.vy * dt;
      if (weed.y > ground) {
        weed.y = ground;
        weed.vy = Math.random() < 0.05 ? -rand(200, 380) : -Math.abs(weed.vy) * 0.35;
      }
      weed.rot += (weed.vx / weed.r) * dt;
      if (weed.x > w + 80) {
        weed.active = false;
        wait = rand(12, 30) / env.intensity;
      }
    },
    draw(g) {
      if (!weed.active) return;
      g.save();
      g.translate(weed.x, weed.y);
      g.rotate(weed.rot);
      g.strokeStyle = "rgba(170,130,80,0.85)";
      g.lineWidth = 1.2;
      g.beginPath();
      for (const [a1, r1, a2, r2] of lines) {
        g.moveTo(Math.cos(a1) * r1 * weed.r, Math.sin(a1) * r1 * weed.r);
        g.quadraticCurveTo(0, 0, Math.cos(a2) * r2 * weed.r, Math.sin(a2) * r2 * weed.r);
      }
      g.stroke();
      g.restore();
    },
    click(x, y) {
      if (weed.active && Math.hypot(x - weed.x, y - weed.y) < weed.r * 1.8) {
        weed.vy = -rand(450, 650);
        weed.vx *= 1.3;
        return true;
      }
      return false;
    },
  };
};

/** Early bird: soft god-rays from the top corner with dust drifting through them. */
export const sunrays: Factory = (env) => {
  const motes = Array.from({ length: density(env, 40) }, () => ({ x: rand(0, env.w), y: rand(0, env.h), v: rand(4, 12), p: rand(0, TAU) }));
  return {
    layer: "back",
    update({ dt, t, w, h }) {
      for (const m of motes) {
        m.y += m.v * dt;
        m.x += Math.sin(t * 0.3 + m.p) * 6 * dt;
        if (m.y > h) Object.assign(m, { y: -5, x: rand(0, w) });
      }
    },
    draw(g, { w, h, t, colors }) {
      g.save();
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 6; i++) {
        const angle = 0.35 + i * 0.13 + Math.sin(t * 0.15 + i) * 0.03;
        const spread = 0.035 + (i % 3) * 0.015;
        const len = Math.hypot(w, h) * 1.1;
        const grad = g.createLinearGradient(0, 0, Math.cos(angle) * len, Math.sin(angle) * len);
        grad.addColorStop(0, rgba("#fff3d6", 0.1 * env.intensity));
        grad.addColorStop(1, rgba(colors[0], 0));
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(-40, -40);
        g.lineTo(Math.cos(angle - spread) * len, Math.sin(angle - spread) * len);
        g.lineTo(Math.cos(angle + spread) * len, Math.sin(angle + spread) * len);
        g.fill();
      }
      for (const m of motes) drawGlow(g, "#fff1c9", m.x, m.y, 3, 0.35 + 0.35 * Math.sin(t + m.p));
      g.restore();
    },
  };
};

/** Jazz & blues: lazy smoke curling up from below; wave the cursor through it. */
export const smoke: Factory = (env) => {
  const puffs: { x: number; y: number; r: number; vx: number; life: number; max: number }[] = [];
  let spawn = 0;
  return {
    layer: "back",
    update({ dt, w, h, t, pointer }) {
      spawn -= dt;
      if (spawn <= 0) {
        const max = rand(9, 16);
        puffs.push({ x: rand(0, w), y: h + 40, r: rand(40, 90), vx: 0, life: max, max });
        spawn = rand(0.25, 0.6) / env.intensity;
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life -= dt;
        p.y -= 28 * dt;
        p.r += 6 * dt;
        p.vx *= 0.96;
        if (pointer.inside && Math.hypot(p.x - pointer.x, p.y - pointer.y) < p.r * 1.3) p.vx += pointer.vx * 0.015;
        p.x += (p.vx + Math.sin(t * 0.4 + p.y * 0.01) * 14) * dt;
        if (p.life <= 0) puffs.splice(i, 1);
      }
    },
    draw(g, { colors, light }) {
      const tint = light ? "#6b6b78" : colors[2] ?? "#b8b8c8";
      for (const p of puffs) {
        const a = Math.sin((p.life / p.max) * Math.PI) * 0.3;
        g.globalAlpha = a;
        g.drawImage(glowCanvas(tint), p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      g.globalAlpha = 1;
    },
  };
};

