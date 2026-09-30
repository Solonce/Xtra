import Link from "next/link";
import { Mesh } from "@/components/Mesh";

export default function NotFound() {
  return (
    <div className="relative grid min-h-screen place-items-center px-5 text-center">
      <Mesh />
      <div>
        <p className="font-display text-7xl italic text-accent">silence.</p>
        <p className="mt-4 text-muted">No one is scrobbling under that name.</p>
        <Link href="/" className="mt-8 inline-block rounded-full bg-fg px-5 py-3 text-bg">
          Back home
        </Link>
      </div>
    </div>
  );
}
