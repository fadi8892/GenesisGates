// src/components/Logo.tsx
import Link from "next/link";
import Image from "next/image";

type Props = {
  size?: number;           // height in px
  showWordmark?: boolean;  // toggle text next to the icon
};

export default function Logo({ size = 32, showWordmark = true }: Props) {
  return (
    <Link href="/" className="flex items-center gap-2 select-none">
      {/* If you have an SVG in /public */}
      {/* <Image src="/logo.svg" alt="Genesis Gates" width={size} height={size} priority className="dark:invert-0" /> */}

      {/* If using PNG/JPG instead, swap the src */}
      <Image src="/logo.svg" alt="Genesis Gates" width={size} height={size} priority />

      {showWordmark && (
        <span className="font-semibold tracking-tight text-lg md:text-xl">
          GenesisGates
        </span>
      )}
    </Link>
  );
}
