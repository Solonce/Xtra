import { accentOnDark, hexToRgb, mix, rgbToHex } from "./color";

/** CSS custom properties that re-skin a page from a listening palette. */
export function themeVars(palette: string[], mood: "light" | "dark" = "dark"): React.CSSProperties {
  const [p1, p2, p3, p4] = palette;
  if (mood === "light") {
    return {
      "--p1": p1, "--p2": p2, "--p3": p3, "--p4": p4,
      "--bg": rgbToHex(mix(hexToRgb(p1), [255, 255, 255], 0.8)),
      "--fg": "#141417",
      "--muted": "#4b4b55",
      "--card": "rgb(255 255 255 / 0.5)",
      "--line": "rgb(0 0 0 / 0.08)",
      "--veil": "rgb(255 255 255 / 0.35)",
      "--accent": rgbToHex(mix(hexToRgb(p2 ?? p1), [0, 0, 0], 0.35)),
      colorScheme: "light",
    } as React.CSSProperties;
  }
  return {
    "--p1": p1, "--p2": p2, "--p3": p3, "--p4": p4,
    "--bg": rgbToHex(mix(hexToRgb(p4 ?? p1), [6, 6, 9], 0.85)),
    "--accent": accentOnDark(p1),
  } as React.CSSProperties;
}
