import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-zinc-800 text-zinc-300 border-zinc-700",
  success: "bg-green-500/20 text-green-400 border-green-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  outline: "bg-transparent text-zinc-300 border-zinc-600",
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
