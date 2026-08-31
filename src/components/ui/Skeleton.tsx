import { cn } from "@/lib/utils";

export interface SkeletonProps {
  className?: string;
  shape?: "rectangle" | "circle";
}

export function Skeleton({ className, shape = "rectangle" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-zinc-800",
        shape === "circle" ? "rounded-full" : "rounded-lg",
        className
      )}
    />
  );
}
