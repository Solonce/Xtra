import { clamp, type Factory, noiseBurst, pick, rand, rgba, TAU, tone } from "./core";

let noiseTile: HTMLCanvasElement | null = null;
function noise() {
  if (noiseTile) return noiseTile;
  noiseTile = document.createElement("canvas");
  noiseTile.width = noiseTile.height = 128;
  const g = noiseTile.getContext("2d")!;
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return noiseTile;
}

/** Grunge & alt-rock: film scratches, flickering static patches; click for interference. */
export const staticFx: Factory = (env) => {
  let burstT = 0;
  let patchT = 0;
  let patch = { x: 0, y: 0, w: 0, h: 0 };
  let scratches: number[] = [];
  let scratchT = 0;
  return {
    layer: "front",
    update({ dt, w, h }) {
      burstT = Math.max(0, burstT - dt);
      patchT -= dt;
      if (patchT < -rand(2, 7) / env.intensity) {
        patchT = rand(0.08, 0.25);
        patch = { x: rand(0, w), y: rand(0, h), w: rand(80, 320), h: rand(4, 40) };
      }
      scratchT -= dt;
      if (scratchT <= 0) {
        scratchT = rand(0.05, 0.2);
        scratches = Math.random() < 0.35 * env.intensity ? Array.from({ length: Math.round(rand(1, 3)) }, () => rand(0, w)) : [];
      }
    },
    draw(g, { w, h }) {
      const tile = noise();
      const ox = rand(0, 128), oy = rand(0, 128);
      if (patchT > 0) {
        g.globalAlpha = 0.25;
        g.save();
        g.beginPath();
        g.rect(patch.x, patch.y, patch.w, patch.h);
        g.clip();
        for (let x = patch.x - ox; x < patch.x + patch.w; x += 128) for (let y = patch.y - oy; y < patch.y + patch.h; y += 128) g.drawImage(tile, x, y);
        g.restore();
      }
      if (burstT > 0) {
        g.globalAlpha = burstT * 0.35;
        for (let x = -ox; x < w; x += 128) for (let y = -oy; y < h; y += 128) g.drawImage(tile, x, y);
        g.globalAlpha = burstT * 0.5;
        g.fillStyle = "#000";
        g.fillRect(0, rand(0, h), w, rand(6, 30));
      }
      g.globalAlpha = 1;
      g.strokeStyle = "rgba(255,255,255,0.18)";
      g.lineWidth = 1;
      for (const x of scratches) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + rand(-4, 4), h);
        g.stroke();
      }
    },
    click() {
      burstT = 0.45;
      noiseBurst(0.3, 0.04, 3000);
      return false;
    },
  };
};

/** Experimental: the page occasionally corrupts itself; click to glitch it on purpose. */
export const glitch: Factory = (env) => {
  let active = 0;
  let next = rand(3, 8);
  let slices: { y: number; h: number; dx: number; color: string }[] = [];
  const trigger = (strength: number) => {
    active = rand(0.12, 0.28) * strength;
    slices = Array.from({ length: Math.round(rand(3, 8) * strength) }, () => ({
      y: rand(0, env.h), h: rand(2, 26), dx: rand(-40, 40), color: pick(["#ff00d4", "#00f0ff", "#ffffff", env.colors[0]]),
    }));
  };
  return {
    layer: "front",
    update({ dt }) {
      active = Math.max(0, active - dt);
      if ((next -= dt) <= 0) {
        trigger(1);
        next = rand(5, 14) / env.intensity;
      }
    },
    draw(g, { w }) {
      if (active <= 0) return;
      g.save();
      g.globalCompositeOperation = "difference";
      for (const s of slices) {
        g.fillStyle = rgba(s.color, 0.55);
        g.fillRect(s.dx, s.y, w, s.h);
      }
      g.restore();
      for (let i = 0; i < 12; i++) {
        g.fillStyle = rgba(pick(["#ff00d4", "#00f0ff", "#000000"]), 0.5);
        g.fillRect(rand(0, w), rand(0, env.h), rand(8, 60), rand(4, 14));
      }
    },
    click() {
      trigger(1.8);
      noiseBurst(0.08, 0.05, 5000);
      return false;
    },
  };
};

/** Lo-fi & chill: VHS scanlines, a rolling tracking band and a PLAY stamp. */
export const vhs: Factory = (env) => {
  let band = rand(0, env.h);
  let jitter = 0;
  const born = performance.now();
  return {
    layer: "front",
    update({ dt, h }) {
      band = (band + dt * 60) % (h + 200);
      jitter = Math.max(0, jitter - dt);
    },
    draw(g, { w, h, t }) {
      g.fillStyle = "rgba(0,0,0,0.05)";
      for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
      const by = band - 100;
      const grad = g.createLinearGradient(0, by, 0, by + 40);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, `rgba(255,255,255,${0.035 + jitter * 0.1})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, by, w, 40);
      if (jitter > 0) {
        for (let i = 0; i < 6; i++) {
          g.fillStyle = `rgba(255,255,255,${rand(0.03, 0.12)})`;
          g.fillRect(rand(-20, 20), rand(0, h), w, rand(1, 3));
        }
      }
      const age = (performance.now() - born) / 1000;
      if (age < 5) {
        g.globalAlpha = clamp(5 - age, 0, 1) * (Math.sin(t * 4) > -0.6 ? 1 : 0.2);
        g.fillStyle = "#ffffff";
        g.font = "600 20px ui-monospace, Menlo, monospace";
        g.fillText("PLAY ►", 28, 42);
        g.font = "15px ui-monospace, Menlo, monospace";
        g.fillText(new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }), 28, 64);
        g.globalAlpha = 1;
      }
    },
    click() {
      jitter = 0.6;
      return false;
    },
  };
};

type Splat = { x: number; y: number; dots: [number, number, number][]; drips: { x: number; len: number; max: number; w: number }[]; color: string; life: number };

/** Hip-hop: click to tag the wall with a spray-paint burst that drips before fading. */
export const spray: Factory = () => {
  const splats: Splat[] = [];
  return {
    layer: "front",
    update({ dt }) {
      for (let i = splats.length - 1; i >= 0; i--) {
        const s = splats[i];
        s.life -= dt / 9;
        for (const d of s.drips) d.len = Math.min(d.max, d.len + dt * 22);
        if (s.life <= 0) splats.splice(i, 1);
      }
    },
    draw(g) {
      for (const s of splats) {
        const a = Math.min(1, s.life * 2) * 0.75;
        g.fillStyle = rgba(s.color, a);
        for (const [dx, dy, r] of s.dots) {
          g.beginPath();
          g.arc(s.x + dx, s.y + dy, r, 0, TAU);
          g.fill();
        }
        for (const d of s.drips) g.fillRect(s.x + d.x - d.w / 2, s.y, d.w, d.len);
      }
    },
    click(x, y, env) {
      const color = pick(env.colors.slice(0, 3));
      const dots: [number, number, number][] = [];
      for (let i = 0; i < 260; i++) {
        const r = Math.abs(rand(-1, 1) + rand(-1, 1)) * 26;
        const a = rand(0, TAU);
        dots.push([Math.cos(a) * r, Math.sin(a) * r, i < 40 ? rand(4, 9) : rand(0.6, 2)]);
      }
      const drips = Array.from({ length: Math.round(rand(2, 5)) }, () => ({ x: rand(-20, 20), len: 0, max: rand(20, 90), w: rand(2, 4) }));
      splats.push({ x, y, dots, drips, color, life: 1 });
      if (splats.length > 12) splats.shift();
      noiseBurst(0.35, 0.03, 6000);
      return false;
    },
  };
};

type Piece = { x: number; y: number; vx: number; vy: number; rot: number; spin: number; w: number; h: number; color: string; life: number };

/** Latin & tropical: confetti on every click (and a small welcome burst). */
export const confetti: Factory = (env) => {
  const pieces: Piece[] = [];
  const pop = (x: number, y: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const v = rand(300, 750);
      pieces.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: rand(0, TAU), spin: rand(-12, 12),
        w: rand(5, 10), h: rand(3, 6), color: pick([...env.colors.slice(0, 3), "#ffd84a", "#ff5ca8", "#2de2e6"]), life: rand(2, 3.5),
      });
    }
  };
  let welcomed = false;
  return {
    layer: "front",
    update({ dt, w, h }) {
      if (!welcomed) {
        welcomed = true;
        pop(w * 0.2, h, 50);
        pop(w * 0.8, h, 50);
      }
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.vy += 900 * dt;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        if ((p.life -= dt) <= 0 || p.y > h + 20) pieces.splice(i, 1);
      }
    },
    draw(g) {
      for (const p of pieces) {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.scale(1, Math.cos(p.rot * 1.7));
        g.globalAlpha = Math.min(1, p.life);
        g.fillStyle = p.color;
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        g.restore();
      }
      g.globalAlpha = 1;
    },
    click(x, y) {
      pop(x, y, 60);
      return false;
    },
  };
};

// A pentatonic scale sounds pleasant whatever order you click in.
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

/** Classical & score: notes drift up the page; click to play one (higher up = higher pitch). */
export const notes: Factory = (env) => {
  const glyphs = ["♪", "♫", "♩", "♬"];
  const list: { x: number; y: number; v: number; p: number; glyph: string; size: number; life: number; bright: number }[] = [];
  const add = (x: number, y: number, bright = 0) =>
    list.push({ x, y, v: rand(12, 26), p: rand(0, TAU), glyph: pick(glyphs), size: rand(18, 34), life: 1, bright });
  for (let i = 0; i < Math.round(6 + 10 * env.intensity); i++) add(rand(0, env.w), rand(0, env.h));
  return {
    layer: "back",
    update({ dt, t, w, h }) {
      for (let i = list.length - 1; i >= 0; i--) {
        const n = list[i];
        n.y -= n.v * dt;
        n.x += Math.sin(t * 0.8 + n.p) * 10 * dt;
        n.bright = Math.max(0, n.bright - dt * 0.5);
        if (n.y < -30) {
          if (list.length > 24) list.splice(i, 1);
          else Object.assign(n, { y: h + 30, x: rand(0, w) });
        }
      }
    },
    draw(g, { colors, light }) {
      g.textAlign = "center";
      for (const n of list) {
        g.font = `${n.size}px serif`;
        g.fillStyle = n.bright > 0 ? rgba(colors[0], 0.5 + n.bright * 0.5) : light ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.32)";
        g.fillText(n.glyph, n.x, n.y);
      }
      g.textAlign = "start";
    },
    click(x, y, env) {
      const idx = clamp(Math.floor((1 - y / env.h) * SCALE.length), 0, SCALE.length - 1);
      tone(SCALE[idx], 1.6, "triangle", 0.07);
      add(x, y, 1);
      return false;
    },
  };
};

type Plane = { x: number; y: number; vx: number; vy: number; rot: number; life: number };

/** Indie: paper planes glide across; click to throw your own. */
export const planes: Factory = (env) => {
  const list: Plane[] = [];
  let next = rand(2, 5);
  const launch = (x: number, y: number, vx: number) => list.push({ x, y, vx, vy: rand(-60, -10), rot: 0, life: 12 });
  return {
    layer: "back",
    update({ dt, t, w, h }) {
      if ((next -= dt) <= 0) {
        const fromLeft = Math.random() < 0.5;
        launch(fromLeft ? -30 : w + 30, rand(h * 0.1, h * 0.6), (fromLeft ? 1 : -1) * rand(90, 170));
        next = rand(7, 16) / env.intensity;
      }
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.vy += Math.sin(t * 1.5 + i) * 30 * dt + 8 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot = Math.atan2(p.vy, p.vx);
        if ((p.life -= dt) <= 0 || p.x < -60 || p.x > w + 60 || p.y > h + 60) list.splice(i, 1);
      }
    },
    draw(g, { colors }) {
      for (const p of list) {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillStyle = "rgba(255,255,255,0.85)";
        g.beginPath();
        g.moveTo(14, 0);
        g.lineTo(-10, -8);
        g.lineTo(-5, 0);
        g.lineTo(-10, 8);
        g.closePath();
        g.fill();
        g.fillStyle = rgba(colors[0], 0.5);
        g.beginPath();
        g.moveTo(14, 0);
        g.lineTo(-5, 0);
        g.lineTo(-10, 8);
        g.fill();
        g.restore();
      }
    },
    click(x, y) {
      launch(x, y, (x < window.innerWidth / 2 ? 1 : -1) * rand(180, 260));
      return false;
    },
  };
};

/** On repeat: the obsession spins on a record in the corner. Drag it to scratch. */
export const vinyl: Factory = (env) => {
  let angle = 0;
  let spin = (33.3 / 60) * TAU; // 33⅓ rpm
  let dragging = false;
  let lastPointer = 0;
  const img = env.extras.vinylCover ? Object.assign(new Image(), { src: env.extras.vinylCover }) : null;
  const R = 46;
  const center = (w: number, h: number) => ({ x: w - R - 22, y: h - R - 22 });
  return {
    layer: "front",
    update({ dt, w, h, pointer }) {
      const c = center(w, h);
      if (dragging && pointer.down) {
        const a = Math.atan2(pointer.y - c.y, pointer.x - c.x);
        let delta = a - lastPointer;
        if (delta > Math.PI) delta -= TAU;
        if (delta < -Math.PI) delta += TAU;
        if (Math.sign(delta) !== Math.sign(spin) && Math.abs(delta) > 0.05) noiseBurst(0.05, 0.05, 1200 + Math.abs(delta) * 3000);
        angle += delta;
        spin = delta / Math.max(dt, 0.001);
        lastPointer = a;
      } else {
        dragging = false;
        spin += ((33.3 / 60) * TAU - spin) * Math.min(1, dt * 2);
        angle += spin * dt;
      }
    },
    draw(g, { w, h, colors }) {
      const c = center(w, h);
      g.save();
      g.translate(c.x, c.y);
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.beginPath();
      g.arc(3, 5, R, 0, TAU);
      g.fill();
      g.rotate(angle);
      g.fillStyle = "#0d0d10";
      g.beginPath();
      g.arc(0, 0, R, 0, TAU);
      g.fill();
      g.strokeStyle = "rgba(255,255,255,0.06)";
      for (let r = R * 0.45; r < R - 2; r += 3) {
        g.beginPath();
        g.arc(0, 0, r, 0, TAU);
        g.stroke();
      }
      g.save();
      g.beginPath();
      g.arc(0, 0, R * 0.38, 0, TAU);
      g.clip();
      if (img?.complete && img.naturalWidth) g.drawImage(img, -R * 0.38, -R * 0.38, R * 0.76, R * 0.76);
      else {
        g.fillStyle = colors[0];
        g.fill();
      }
      g.restore();
      g.fillStyle = "#08080a";
      g.beginPath();
      g.arc(0, 0, 2.5, 0, TAU);
      g.fill();
      // sheen
      g.rotate(-angle);
      const sheen = g.createLinearGradient(-R, -R, R, R);
      sheen.addColorStop(0.35, "rgba(255,255,255,0)");
      sheen.addColorStop(0.5, "rgba(255,255,255,0.09)");
      sheen.addColorStop(0.65, "rgba(255,255,255,0)");
      g.fillStyle = sheen;
      g.beginPath();
      g.arc(0, 0, R, 0, TAU);
      g.fill();
      g.restore();
    },
    press(x, y, env) {
      const c = center(env.w, env.h);
      if (Math.hypot(x - c.x, y - c.y) > R) return false;
      dragging = true;
      lastPointer = Math.atan2(y - c.y, x - c.x);
      if (env.extras.vinylTitle) env.say(env.extras.vinylTitle, c.x - 40, c.y - R - 10);
      return true;
    },
    release() {
      dragging = false;
    },
  };
};
