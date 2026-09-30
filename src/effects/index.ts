import type { EffectId } from "@/lib/vibes";
import type { Factory } from "./core";
import { bats, demons, fireflies } from "./creatures";
import { confetti, glitch, notes, planes, spray, staticFx, vhs, vinyl } from "./fx";
import { bokeh, constellation, disco, embers, lanterns, lasers, lava, shootingStars, sparkles } from "./lights";
import { leaves, lightning, petals, rain, smoke, snow, sunrays, tumbleweed } from "./weather";

export const EFFECTS: Record<EffectId, Factory> = {
  rain, snow, lightning, leaves, petals, tumbleweed, sunrays, smoke,
  demons, bats, fireflies,
  bokeh, lasers, disco, lanterns, lava, shootingStars, sparkles, embers, constellation,
  static: staticFx, glitch, vhs, spray, confetti, notes, planes, vinyl,
};
