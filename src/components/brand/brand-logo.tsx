import Link from "next/link";

interface BrandLogoProps {
  className?: string;
  theme?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}

export function BrandMark({ className = "w-[17px] h-[14px]" }: { className?: string }) {
  return (
    <svg
      className={`transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${className}`}
      width="17"
      height="14"
      viewBox="0 0 17 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 13.2c4.6-.4 8.4-2.6 11-6.4L15.6 1M9.6 1.4h6v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function BrandLogo({ className = "", theme = "dark", size = "md" }: BrandLogoProps) {
  const isLight = theme === "light";

  const textSizes = {
    sm: "text-base tracking-[-0.03em]",
    md: "text-xl tracking-[-0.04em]",
    lg: "text-2xl tracking-[-0.045em]",
  };

  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2 font-semibold ${textSizes[size]} ${
        isLight ? "text-white" : "text-ink"
      } ${className}`}
    >
      <span className="-translate-y-[0.5px]">Live Drop</span>
      <span className={isLight ? "text-ember-light" : "text-ember"}>
        <BrandMark />
      </span>
    </Link>
  );
}
