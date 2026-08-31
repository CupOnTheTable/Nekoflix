"use client";

import {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  useEffect(() => {
    if (!open || !contentRef.current) return;
    const focusable = contentRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) focusable[0].focus();
  }, [open]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!open) return null;

  const modal = (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div
        ref={contentRef}
        className={cn(
          "relative w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl",
          "animate-in fade-in zoom-in-95 duration-200",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          {title && (
            <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          )}
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className={cn(
              "ml-auto rounded-md p-1.5 text-zinc-400 transition-colors",
              "hover:bg-zinc-800 hover:text-zinc-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modal, document.body);
  }

  return null;
}
