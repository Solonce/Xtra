/* eslint-disable @next/next/no-img-element -- Spotify CDN artwork, already sized. */
import { fallbackColors } from "@/lib/color";

type Props = {
  src: string | null | undefined;
  alt: string;
  colors?: string[] | null;
  className?: string;
  round?: boolean;
};

/** Album/artist artwork with a generated gradient when there's no image. */
export function Cover({ src, alt, colors, className = "", round = false }: Props) {
  const shape = round ? "rounded-full" : "rounded-xl";
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`${shape} object-cover bg-white/5 ${className}`}
      />
    );
  }
  const [a, b] = colors?.length ? [colors[0], colors[1] ?? colors[0]] : fallbackColors(alt);
  return (
    <div
      role="img"
      aria-label={alt}
      className={`${shape} grid place-items-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      <span className="font-display text-[2.2em] italic text-white/85 leading-none select-none">
        {alt.trim().charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
