import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-16 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-zinc-600">{icon}</div>
      )}
      <h3 className="text-lg font-medium text-zinc-300">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-zinc-500">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="md"
          onClick={onAction}
          className="mt-6"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
