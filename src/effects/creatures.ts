import {
  burst, clamp, counter, density, drawGlow, drawSparks, type Factory, noiseBurst, rand, rgba,
  type Spark, stepSparks, TAU,
} from "./core";

type Demon = {
  x: number; y: number; vx: number; vy: number; dir: 1 | -1; step: number; size: number;
  state: "walk" | "flee" | "dead"; timer: number; hue: number;
};

/**
 * Metal: small horned demons patrol the bottom of the screen. They get nervous when
 * the cursor comes near. Click one to banish it; your kill count is remembered.
 */
export const demons: Factory = (env) => {
  const count = clamp(Math.round(2 + env.intensity * 5), 2, 7);
  const spawn = (fromEdge: boolean): Demon => {
    const dir = Math.random() < 0.5 ? 1 : -1;
    return {
      x: fromEdge ? (dir === 1 ? -30 : env.w + 30) : rand(40, env.w - 40),
      y: 0, vx: 0, vy: 0, dir, step: rand(0, TAU), size: rand(0.8, 1.25),
      state: "walk", timer: rand(1, 4), hue: rand(-12, 12),
    };
  };
  const list = Array.from({ length: count }, () => spawn(false));
  const sparks: Spark[] = [];
  const respawns: number[] = [];

  return {
    layer: "front",
    update({ dt, w, h, pointer }) {
      const ground = h - 10;
      for (const d of list) {
        if (d.state === "dead") continue;
        d.timer -= dt;
        if (d.timer <= 0) {
          d.timer = rand(1.5, 5);
          if (Math.random() < 0.35) d.dir = d.dir === 1 ? -1 : 1;
          if (Math.random() < 0.25 && d.y >= ground - 1) d.vy = -rand(160, 280); // hop
        }
        const near = pointer.inside && Math.abs(pointer.x - d.x) < 110 && pointer.y > h - 200;
        if (near) d.dir = pointer.x < d.x ? 1 : -1;
        d.state = near ? "flee" : "walk";
        const speed = (near ? 150 : 38) * (0.7 + env.intensity * 0.5);
        d.x += d.dir * speed * dt;
        d.step += dt * (near ? 22 : 9);
        d.vy += 900 * dt;
        d.y = Math.min(ground, d.y + d.vy * dt);
        if (d.y >= ground) d.vy = 0;
        if (d.x < 16) d.dir = 1;
        if (d.x > w - 16) d.dir = -1;
      }
      for (let i = respawns.length - 1; i >= 0; i--) {
        respawns[i] -= dt;
        if (respawns[i] <= 0) {
          const idx = list.findIndex((d) => d.state === "dead");
          if (idx >= 0) list[idx] = { ...spawn(true), y: h - 10 };
          respawns.splice(i, 1);
        }
      }
      stepSparks(sparks, dt, 300);
    },
    draw(g, { t }) {
      for (const d of list) {
        if (d.state === "dead") continue;
        const s = 11 * d.size;
        const bob = Math.abs(Math.sin(d.step)) * 2;
        g.save();
        g.translate(d.x, d.y - s - bob);
        g.scale(d.dir, 1);
        // tail
        g.strokeStyle = "#2a0707";
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-s * 0.7, s * 0.3);
        g.quadraticCurveTo(-s * 1.6, s * 0.1 + Math.sin(t * 6 + d.step) * 3, -s * 1.5, -s * 0.5);
        g.stroke();
        g.fillStyle = "#2a0707";
        g.beginPath();
        g.moveTo(-s * 1.5, -s * 0.5);
        g.lineTo(-s * 1.75, -s * 0.2);
        g.lineTo(-s * 1.3, -s * 0.35);
        g.fill();
        // legs
        g.strokeStyle = "#1a0404";
        g.lineWidth = 2.2;
        for (const p of [0, Math.PI]) {
          const swing = Math.sin(d.step + p) * s * 0.35;
          g.beginPath();
          g.moveTo(swing * 0.3, s * 0.6);
          g.lineTo(swing, s + bob);
          g.stroke();
        }
        // body
        g.fillStyle = `hsl(${355 + d.hue} 70% 22%)`;
        g.beginPath();
        g.ellipse(0, 0, s * 0.85, s * 0.8, 0, 0, TAU);
        g.fill();
        // horns
        g.fillStyle = "#e8dcc6";
        for (const side of [-1, 1]) {
          g.beginPath();
          g.moveTo(side * s * 0.35, -s * 0.6);
          g.quadraticCurveTo(side * s * 0.75, -s * 1.1, side * s * 0.55, -s * 1.45);
          g.lineTo(side * s * 0.15, -s * 0.72);
          g.fill();
        }
        // eyes
        const blink = Math.sin(t * 0.7 + d.step * 3) > 0.97 ? 0.2 : 1;
        drawGlow(g, "#ff3b1f", s * 0.3, -s * 0.15, s * 0.6, 0.8);
        g.fillStyle = "#ffd84a";
        g.fillRect(s * 0.12, -s * 0.25, s * 0.18, s * 0.2 * blink);
        g.fillRect(s * 0.42, -s * 0.25, s * 0.18, s * 0.2 * blink);
        g.restore();
      }
      drawSparks(g, sparks);
    },
    click(x, y, env) {
      for (const d of list) {
        if (d.state === "dead") continue;
        const s = 11 * d.size;
        if (Math.hypot(x - d.x, y - (d.y - s)) < s * 2.2) {
          d.state = "dead";
          burst(sparks, d.x, d.y - s, 34, ["#ff3b1f", "#ff8a1f", "#ffd84a", "#2a0707"], 320, 4);
          noiseBurst(0.18, 0.06, 900);
          const n = counter("xtra:demons");
          env.say(n === 1 ? "first demon banished" : `demons banished: ${n}`, d.x, d.y - 40);
          respawns.push(rand(3, 7));
          return true;
        }
      }
      return false;
    },
  };
};

type Bat = { x: number; y: number; vx: number; vy: number; flap: number; size: number; scared: number };

/** Goth & post-punk: bats flit across the screen; click to scatter a colony. */
export const bats: Factory = (env) => {
  const list: Bat[] = [];
  let next = rand(1, 4);
  const add = (x: number, y: number, vx: number, vy: number) =>
    list.push({ x, y, vx, vy, flap: rand(0, TAU), size: rand(0.7, 1.3), scared: 0 });
  const flock = () => {
    const fromLeft = Math.random() < 0.5;
    const y = rand(env.h * 0.08, env.h * 0.5);
    for (let i = 0; i < Math.round(rand(2, 3 + 4 * env.intensity)); i++) {
      add(fromLeft ? -rand(20, 200) : env.w + rand(20, 200), y + rand(-60, 60), (fromLeft ? 1 : -1) * rand(140, 240), rand(-20, 20));
    }
  };
  return {
    layer: "front",
    update({ dt, t, w, h, pointer }) {
      if ((next -= dt) <= 0) {
        flock();
        next = rand(8, 20) / env.intensity;
      }
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i];
        b.flap += dt * (b.scared > 0 ? 30 : 16);
        b.scared = Math.max(0, b.scared - dt);
        if (pointer.inside) {
          const dx = b.x - pointer.x, dy = b.y - pointer.y, d = Math.hypot(dx, dy);
          if (d < 100 && d > 0) {
            b.vx += (dx / d) * 600 * dt;
            b.vy += (dy / d) * 600 * dt;
          }
        }
        b.vy += Math.sin(t * 3 + b.flap * 0.1) * 60 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < -300 || b.x > w + 300 || b.y < -200 || b.y > h + 200) list.splice(i, 1);
      }
    },
    draw(g, { light }) {
      g.fillStyle = light ? "rgba(20,14,28,0.85)" : "rgba(8,6,12,0.92)";
      for (const b of list) {
        const s = 9 * b.size;
        const f = Math.sin(b.flap);
        g.save();
        g.translate(b.x, b.y);
        g.scale(Math.sign(b.vx) || 1, 1);
        g.beginPath();
        for (const side of [-1, 1]) {
          g.moveTo(0, 0);
          g.quadraticCurveTo(side * s, -s * (0.9 * f + 0.2), side * s * 2, -s * 0.6 * f);
          g.quadraticCurveTo(side * s * 1.4, s * 0.1, side * s * 1.1, s * 0.25);
          g.quadraticCurveTo(side * s * 0.6, 0, 0, s * 0.2);
        }
        g.fill();
        g.beginPath();
        g.ellipse(0, s * 0.1, s * 0.3, s * 0.45, 0, 0, TAU);
        g.fill();
        g.restore();
      }
    },
    click(x, y) {
      let hit = false;
      for (const b of list) {
        const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy) || 1;
        if (d < 180) {
          b.vx = (dx / d) * rand(300, 500);
          b.vy = (dy / d) * rand(300, 500) - 100;
          b.scared = 1.5;
          hit = true;
        }
      }
      if (!hit) for (let i = 0; i < 4; i++) add(x, y, rand(-320, 320), rand(-340, -120));
      return false;
    },
  };
};

/** Folk & acoustic: fireflies that drift towards you when you hold still. */
export const fireflies: Factory = (env) => {
  const flies = Array.from({ length: density(env, 34) }, () => ({
    x: rand(0, env.w), y: rand(env.h * 0.2, env.h), vx: 0, vy: 0, p: rand(0, TAU), speed: rand(0.6, 1.4),
  }));
  return {
    layer: "back",
    update({ dt, t, w, h, pointer }) {
      for (const f of flies) {
        f.vx += Math.cos(t * f.speed + f.p) * 30 * dt;
        f.vy += Math.sin(t * f.speed * 1.3 + f.p) * 30 * dt;
        if (pointer.inside) {
          const dx = pointer.x - f.x, dy = pointer.y - f.y, d = Math.hypot(dx, dy);
          if (d < 260 && d > 30) {
            f.vx += (dx / d) * 22 * dt;
            f.vy += (dy / d) * 22 * dt;
          }
        }
        f.vx *= 0.985;
        f.vy *= 0.985;
        f.x = (f.x + f.vx * dt + w) % w;
        f.y = clamp(f.y + f.vy * dt, 0, h);
      }
    },
    draw(g, { t }) {
      for (const f of flies) {
        const blink = Math.max(0, Math.sin(t * 1.7 * f.speed + f.p));
        drawGlow(g, "#e7ff8a", f.x, f.y, 14, blink * 0.75);
        g.fillStyle = rgba("#fbffd9", blink);
        g.fillRect(f.x - 1, f.y - 1, 2, 2);
      }
    },
  };
};
