import { cn } from "@/lib/cn";

export function Logo({ tone = "default" }: { tone?: "default" | "inverse" }) {
  const inverse = tone === "inverse";
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", inverse && "text-white")}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill={inverse ? "#E7F6F1" : "#0D6E56"} />
        <path
          d="M8 21.5V11h6.4c2.8 0 4.5 1.5 4.5 3.8 0 1.6-.9 2.8-2.3 3.4L20.8 21.5h-3.1l-3.4-3.3H11v3.3H8zm3-5.7h3.1c1.2 0 1.9-.6 1.9-1.5s-.7-1.5-1.9-1.5H11v3z"
          fill={inverse ? "#0D6E56" : "#FFFFFF"}
        />
      </svg>
      PedeAI
    </span>
  );
}
